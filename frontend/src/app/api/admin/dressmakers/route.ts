import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") ?? "PENDING").toUpperCase();

  const allowed = new Set(["PENDING", "APPROVED", "REJECTED"]);
  const approvalStatus = allowed.has(status) ? status : "PENDING";

  const rows = await prisma.dressmakerProfile.findMany({
    where: { approvalStatus: approvalStatus as any },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      userId: true,
      displayName: true,
      countryCode: true,
      instagramHandle: true,
      basePriceFrom: true,
      currency: true,
      isPublished: true,
      approvalStatus: true,
      rejectionReason: true,
      createdAt: true,
      user: { select: { email: true } },
      _count: { select: { portfolioItems: true } },
    },
  });

  return NextResponse.json(rows);
}