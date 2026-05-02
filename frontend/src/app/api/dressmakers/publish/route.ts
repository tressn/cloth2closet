import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { checkSuspended } from "@/lib/checkSuspended";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── SUSPENSION BLOCK: suspended dressmakers cannot republish ──
  const blocked = await checkSuspended(session.user.id);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({} as any));
  const isPublished = !!body?.isPublished;

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, approvalStatus: true },
  });

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && profile.approvalStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "Your profile is still under review. You can publish after approval." },
      { status: 403 }
    );
  }

  const updated = await prisma.dressmakerProfile.update({
    where: { userId: session.user.id },
    data: { isPublished },
  });

  return NextResponse.json({ ok: true, profile: updated });
}