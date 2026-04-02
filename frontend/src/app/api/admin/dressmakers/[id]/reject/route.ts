import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as any));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
  }

  const { id } = await params;

  const updated = await prisma.dressmakerProfile.update({
    where: { id },
    data: {
      approvalStatus: "REJECTED",
      approvedAt: null,
      approvedById: session.user.id,
      rejectionReason: reason,
      isPublished: false, // ✅ ensure rejected profiles aren’t published
    },
    select: { id: true, userId: true, displayName: true, rejectionReason: true },
  });

  await prisma.notification.create({
    data: {
      userId: updated.userId,
      type: "PROJECT_UPDATE",
      title: "Profile review: changes needed",
      body: `Reason: ${updated.rejectionReason}`,
      href: "/dashboard/dressmaker/profile",
    },
  });

  return NextResponse.json({ ok: true });
}