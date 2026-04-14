import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { payment: true, milestones: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (project.status === "CANCELED") {
    return NextResponse.json({ error: "Cannot quote a canceled project" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const quotedTotalAmount = Number(body?.quotedTotalAmount);
  const depositPercent = Number(body?.depositPercent);

  if (!Number.isFinite(quotedTotalAmount) || quotedTotalAmount <= 0) {
    return NextResponse.json(
      { error: "quotedTotalAmount must be a positive number (cents)" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(depositPercent) || depositPercent < 25 || depositPercent > 75) {
    return NextResponse.json(
      { error: "depositPercent must be between 25 and 75" },
      { status: 400 }
    );
  }

  const currency =
    typeof body?.currency === "string" ? body.currency.toUpperCase() : project.currency;

  const total = Math.trunc(quotedTotalAmount);
  const pct = Math.trunc(depositPercent);

  // ✅ Find existing milestones
  const depositMilestone = project.milestones.find((m) => m.type === "DEPOSIT");
  const finalMilestone = project.milestones.find((m) => m.type === "FINAL");

  // ✅ Check if deposit is already paid — if so we cannot change it
  const depositAlreadyPaid =
    depositMilestone?.status === MilestoneStatus.PAID ||
    depositMilestone?.status === MilestoneStatus.RELEASED;

  // ✅ Calculate amounts
  // If deposit already paid, use the actual amount paid as the fixed deposit
  // so the final is recalculated as: new total - what was already paid
  const depositAmount = depositAlreadyPaid
    ? depositMilestone!.amount  // keep what was actually paid
    : Math.max(1, Math.trunc((total * pct) / 100));

  const finalAmount = Math.max(1, total - depositAmount);

  // ✅ Guard: new total must be >= deposit already paid
  if (depositAlreadyPaid && total <= depositAmount) {
    return NextResponse.json(
      {
        error: `New total must be greater than the deposit already paid (${depositAmount} cents)`,
      },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // ✅ Only set status to ACCEPTED on first quote (REQUESTED state)
    // Never roll back a project that has already progressed
    const p = await tx.project.update({
      where: { id },
      data: {
        quotedTotalAmount: total,
        depositPercent: pct,
        currency,
        ...(project.status === "REQUESTED" ? { status: "ACCEPTED" } : {}),
      },
    });

    // ✅ Only update deposit if NOT already paid
    if (!depositAlreadyPaid) {
      await tx.milestone.upsert({
        where: { projectId_type: { projectId: id, type: "DEPOSIT" } },
        update: {
          amount: depositAmount,
          title: "Deposit",
          status: MilestoneStatus.INVOICED,
        },
        create: {
          projectId: id,
          type: "DEPOSIT",
          title: "Deposit",
          amount: depositAmount,
          status: MilestoneStatus.INVOICED,
        },
      });
    }

    // ✅ Always update final milestone with recalculated amount
    // If deposit paid: final = new total - deposit already paid
    // If deposit not paid: final = new total - new deposit
    await tx.milestone.upsert({
      where: { projectId_type: { projectId: id, type: "FINAL" } },
      update: {
        amount: finalAmount,
        title: "Final payment",
        // ✅ Only reset to PENDING if not already paid
        ...(!["PAID", "RELEASED"].includes(finalMilestone?.status ?? "")
          ? { status: MilestoneStatus.PENDING }
          : {}),
      },
      create: {
        projectId: id,
        type: "FINAL",
        title: "Final payment",
        amount: finalAmount,
        status: MilestoneStatus.PENDING,
      },
    });

    // ✅ Update payment total
    if (project.payment) {
      await tx.payment.update({
        where: { id: project.payment.id },
        data: { totalAmount: total, currency },
      });
    } else {
      await tx.payment.create({
        data: {
          projectId: id,
          totalAmount: total,
          currency,
          status: "REQUIRES_PAYMENT_METHOD",
        },
      });
    }

    // ✅ Notify customer of updated quote
    await tx.notification.create({
      data: {
        userId: project.customerId,
        type: "QUOTE_APPROVED",
        title: depositAlreadyPaid ? "Invoice updated" : "Quote ready",
        body: depositAlreadyPaid
          ? `Your final payment has been updated to reflect the new total.`
          : `Your quote for ${p.title ?? project.projectCode} is ready to review.`,
        href: `/dashboard/customer/projects/${id}`,
        projectId: id,
      },
    });

    const conversation = await tx.conversation.findFirst({
      where: { projectId: id },
      select: { id: true },
    });

    if (conversation) {
      const fmt = (cents: number) =>
        (cents / 100).toLocaleString("en-US", { style: "currency", currency });

      const messageText = depositAlreadyPaid
        ? [
            `Invoice updated for: ${p.title ?? project.projectCode}`,
            ``,
            `Original total: ${fmt(project.quotedTotalAmount ?? total)}`,
            `New total: ${fmt(total)}`,
            `Deposit already paid: ${fmt(depositAmount)}`,
            `Remaining balance due: ${fmt(finalAmount)}`,
            ``,
            `Please review the updated invoice on your project page.`,
          ].join("\n")
        : [
            `Quote ready for: ${p.title ?? project.projectCode}`,
            ``,
            `Total: ${fmt(total)}`,
            `Deposit due now (${pct}%): ${fmt(depositAmount)}`,
            `Final payment (after approval): ${fmt(finalAmount)}`,
            ``,
            `Please review and pay the deposit on your project page to get started.`,
          ].join("\n");
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: project.dressmakerId,
          text: messageText,
          attachments: [],
        },
      });
    }

    return { project: p, depositAmount, finalAmount };
  });

  return NextResponse.json({
    ok: true,
    project: updated.project,
    depositAmount: updated.depositAmount,
    finalAmount: updated.finalAmount,
    depositAlreadyPaid,
    note: depositAlreadyPaid
      ? `Deposit of ${depositAmount} cents was already paid and has not changed. Final payment updated to ${finalAmount} cents.`
      : undefined,
  });
}