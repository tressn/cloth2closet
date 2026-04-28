import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ customerId: id }, { dressmakerId: id }],
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      updatedAt: true,
      projectId: true,
      project: { select: { title: true, projectCode: true } },
      customer: { select: { name: true, username: true, email: true } },
      dressmaker: { select: { name: true, username: true, email: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { text: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ conversations });
}