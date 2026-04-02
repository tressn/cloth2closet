import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const updated = await prisma.dressmakerProfile.update({
    where: { id },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      rejectionReason: null,
    },
    select: { id: true, userId: true, displayName: true },
  });

  await prisma.notification.create({
    data: {
      userId: updated.userId,
      type: "PROJECT_UPDATE",
      title: "You’ve been approved 🎉",
      body: "Your dressmaker profile was approved. You can now publish your profile and appear in marketplace discovery.",
      href: "/dashboard/dressmaker/profile",
    },
  });

  return NextResponse.json({ ok: true });
}