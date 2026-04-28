import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { targetUserId } = await req.json();
  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const adminId = session.user.id;

  // Determine role slots: admin fills the opposite side
  const isDressmaker = target.role === "DRESSMAKER";
  const customerId = isDressmaker ? adminId : targetUserId;
  const dressmakerId = isDressmaker ? targetUserId : adminId;

  // Check if a conversation already exists between these two
  const existing = await prisma.conversation.findFirst({
    where: {
      customerId,
      dressmakerId,
      projectId: null, // support DMs have no project
    },
  });

  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const convo = await prisma.conversation.create({
    data: { customerId, dressmakerId },
  });

  return NextResponse.json({ conversationId: convo.id });
}