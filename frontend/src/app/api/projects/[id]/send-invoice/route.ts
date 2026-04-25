import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { MilestoneStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { milestones: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    project.dressmakerId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const finalMilestone = project.milestones.find(
    (m) => m.type === "FINAL"
  );

  if (!finalMilestone) {
    return NextResponse.json(
      { error: "No final milestone exists. Update the invoice first." },
      { status: 400 }
    );
  }

  if (finalMilestone.amount <= 0) {
    return NextResponse.json(
      { error: "Final amount must be greater than zero." },
      { status: 400 }
    );
  }

  if (
    finalMilestone.status === MilestoneStatus.PAID ||
    finalMilestone.status === MilestoneStatus.RELEASED
  ) {
    return NextResponse.json(
      { error: "Final payment is already paid." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.milestone.update({
      where: { id: finalMilestone.id },
      data: { status: MilestoneStatus.INVOICED },
    }),
    prisma.notification.create({
      data: {
        userId: project.customerId,
        type: "QUOTE_APPROVED",
        title: "Final invoice ready",
        body: "Your dressmaker has sent the final invoice. Please review and pay.",
        href: `/dashboard/customer/projects/${id}`,
        projectId: id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}