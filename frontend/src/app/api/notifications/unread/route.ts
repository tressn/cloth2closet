import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ hasUnread: false });
  }

  const count = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ hasUnread: count > 0, count });
}