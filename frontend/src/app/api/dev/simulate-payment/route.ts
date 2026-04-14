import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus, ProjectStatus } from "@prisma/client";

// ✅ SAFETY: This endpoint only works in development.
// It will hard-refuse in production so it can never be exploited.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { projectId, milestoneType } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  if (milestoneType !== "DEPOSIT" && milestoneType !== "FINAL") {
    return NextResponse.json(
      { error: "milestoneType must be DEPOSIT or FINAL" },
      { status: 400 }
    );
  }

  // Load the project and the relevant milestone
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: true,
      payment: true,
      details: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Only the customer or admin can simulate payment
  if (
    project.customerId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const milestone = project.milestones.find((m) => m.type === milestoneType);

  if (!milestone) {
    return NextResponse.json(
      { error: `No ${milestoneType} milestone found. Has the dressmaker sent a quote yet?` },
      { status: 400 }
    );
  }

  if (
    milestone.status === MilestoneStatus.PAID ||
    milestone.status === MilestoneStatus.RELEASED
  ) {
    return NextResponse.json(
      { error: `${milestoneType} milestone is already paid` },
      { status: 400 }
    );
  }

  // Guard: final payment requires final approval first
  if (milestoneType === "FINAL" && !project.details?.finalApprovedAt) {
    return NextResponse.json(
      { error: "Final must be approved by the customer before paying the final amount" },
      { status: 400 }
    );
  }

  const now = new Date();

  // For final milestone: set payoutEligibleAt 7 days out (matches your dispute window)
  const payoutEligibleAt =
    milestoneType === "FINAL"
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      : now; // deposit is eligible immediately

  await prisma.$transaction(async (tx) => {
    // 1. Mark milestone as PAID
    await tx.milestone.update({
      where: { id: milestone.id },
      data: {
        status: MilestoneStatus.PAID,
        paidAt: now,
        payoutEligibleAt,
      },
    });

    // 2. Mark payment as SUCCEEDED
    if (project.payment) {
      await tx.payment.update({
        where: { id: project.payment.id },
        data: { status: "SUCCEEDED" },
      });
    }

    // 3. If deposit: move project to IN_PROGRESS
    if (milestoneType === "DEPOSIT") {
      await tx.project.update({
        where: { id: project.id },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      await tx.notification.create({
        data: {
          userId: project.dressmakerId,
          type: "PAYMENT_SUCCEEDED",
          title: "Deposit received",
          body: `Deposit paid for ${project.title ?? project.projectCode}. Project is now in progress.`,
          href: `/dashboard/dressmaker/projects/${project.id}`,
          projectId: project.id,
        },
      });
    }

    // 4. If final: notify dressmaker
    if (milestoneType === "FINAL") {
      await tx.notification.create({
        data: {
          userId: project.dressmakerId,
          type: "PAYMENT_SUCCEEDED",
          title: "Final payment received",
          body: `Final payment received for ${project.title ?? project.projectCode}.`,
          href: `/dashboard/dressmaker/projects/${project.id}`,
          projectId: project.id,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    simulated: true,
    milestoneType,
    message:
      milestoneType === "DEPOSIT"
        ? "Deposit marked paid. Project is now IN_PROGRESS."
        : "Final payment marked paid. Payout eligible in 7 days.",
  });
}