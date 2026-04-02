import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, approvalStatus: true, displayName: true },
  });

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && profile.approvalStatus !== "REJECTED") {
    return NextResponse.json({ error: "Review request is only available after rejection." }, { status: 400 });
  }

  await prisma.dressmakerProfile.update({
    where: { userId: session.user.id },
    data: {
      approvalStatus: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedById: null,
      isPublished: false,
    },
  });

  // ✅ notify admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "PROJECT_UPDATE",
        title: "Dressmaker requested re-review",
        body: `${profile.displayName ?? "A dressmaker"} requested review again.`,
        href: "/dashboard/admin/dressmakers?status=PENDING",
      })),
    });
  }

  return NextResponse.json({ ok: true });
}