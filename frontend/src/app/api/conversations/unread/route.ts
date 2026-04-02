import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: true, hasUnread: false });

  const userId = session.user.id;

  // Find any convo where latest message is newer than lastReadAt for this user
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ customerId: userId }, { dressmakerId: userId }] },
    select: {
      id: true,
      updatedAt: true,
      messages: { take: 1, orderBy: { createdAt: "desc" }, select: { createdAt: true } },
      conversationReads: { where: { userId }, take: 1, select: { lastReadAt: true } },
    },
    take: 50,
  });

  const hasUnread = convos.some((c) => {
    const lastAt = c.messages[0]?.createdAt ?? c.updatedAt;
    const readAt = c.conversationReads[0]?.lastReadAt ?? null;
    return readAt ? lastAt > readAt : true;
  });

  return NextResponse.json({ ok: true, hasUnread });
}