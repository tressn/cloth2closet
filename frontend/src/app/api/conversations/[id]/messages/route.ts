import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const text = typeof body?.text === "string" ? body.text.trim() : ""

  if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 })

  const convo = await prisma.conversation.findUnique({ where: { id } })
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const userId = session.user.id
  if (convo.customerId !== userId && convo.dressmakerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const msg = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: userId,
      text,
      attachments: [],
    },
  })

  // bump conversation updatedAt by touching it (optional)
  await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

  return NextResponse.json({ ok: true, messageId: msg.id })
}
