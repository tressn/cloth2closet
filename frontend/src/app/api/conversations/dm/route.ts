import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const dressmakerUserId = typeof body?.dressmakerUserId === "string" ? body.dressmakerUserId : null
  if (!dressmakerUserId) return NextResponse.json({ error: "dressmakerUserId required" }, { status: 400 })

  const customerId = session.user.id

  // Prevent messaging yourself
  if (customerId === dressmakerUserId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 })
  }

  // Find existing DM convo (projectId = null)
  const existing = await prisma.conversation.findFirst({
    where: {
      customerId,
      dressmakerId: dressmakerUserId,
      projectId: null,
    },
    orderBy: { createdAt: "asc" },
  })

  if (existing) {
    return NextResponse.json({ ok: true, conversationId: existing.id })
  }

  const convo = await prisma.conversation.create({
    data: {
      customerId,
      dressmakerId: dressmakerUserId,
      projectId: null,
      messages: {},
    },
  })

  return NextResponse.json({ ok: true, conversationId: convo.id })
}
