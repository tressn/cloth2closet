import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const depositAmount = Math.max(1, Math.trunc((total * pct) / 100));
  const finalAmount = Math.max(1, total - depositAmount);

  const updated = await prisma.$transaction(async (tx) => {
    // Update project “contract”
    const p = await tx.project.update({
      where: { id },
      data: {
        quotedTotalAmount: total,
        depositPercent: pct,
        currency,
        status: "ACCEPTED",
      },
    });

    // Create/update milestones
    const depositMilestone = await tx.milestone.upsert({
      where: { projectId_type: { projectId: id, type: "DEPOSIT" } },
      update: { amount: depositAmount, title: "Deposit", status: MilestoneStatus.INVOICED },
      create: {
        projectId: id,
        type: "DEPOSIT",
        title: "Deposit",
        amount: depositAmount,
        status: MilestoneStatus.INVOICED,
      },
    });

    const finalMilestone = await tx.milestone.upsert({
      where: { projectId_type: { projectId: id, type: "FINAL" } },
      update: { amount: finalAmount, title: "Final payment", status: MilestoneStatus.PENDING },
      create: {
        projectId: id,
        type: "FINAL",
        title: "Final payment",
        amount: finalAmount,
        status: MilestoneStatus.PENDING,
      },
    });

    // Optional: keep Payment as rollup summary (not used for checkout)
    const payment = project.payment
      ? await tx.payment.update({
          where: { id: project.payment.id },
          data: {
            totalAmount: total, // store total rollup
            currency,
            status: "REQUIRES_PAYMENT_METHOD",
          },
        })
      : await tx.payment.create({
          data: {
            projectId: id,
            totalAmount: total,
            currency,
            status: "REQUIRES_PAYMENT_METHOD",
          },
        });

    return { project: p, depositMilestone, finalMilestone, payment };
  });

  await prisma.notification.create({
    data: {
      userId: project.customerId,
      type: "QUOTE_APPROVED",
      title: "Quote approved",
      body: updated.project.title ?? project.projectCode,
      href: "/dashboard/customer/quotes",
      projectId: id,
    },
  });

  return NextResponse.json({
    ok: true,
    project: updated.project,
    depositAmount,
    finalAmount,
  });
}
