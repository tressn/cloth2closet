import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { FilePurpose } from "@prisma/client"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id: conversationId } = await params
  const userId = session.user.id

  // 1) Make sure conversation exists
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true, dressmakerId: true, projectId: true },
  })

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  // 2) Authorization: user must be in this conversation
  const isMember =
    convo.customerId === userId || convo.dressmakerId === userId || session.user.role === "ADMIN"
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 3) Parse body
  const body = await req.json()
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  const attachmentsRaw = body?.attachments

  const attachments: string[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((u: any) => String(u).trim()).filter(Boolean)
    : []

  if (!text && attachments.length === 0) {
    return NextResponse.json(
      { error: "Message must include text or at least 1 attachment" },
      { status: 400 }
    )
  }

  // Optional safety: limit to prevent abuse
  if (attachments.length > 10) {
    return NextResponse.json({ error: "Too many attachments (max 10)" }, { status: 400 })
  }

  // 4) Create Message row
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      text: text || null,
      attachments, // this is the Message.attachments String[] you already have
    },
  })

  // 5) Create FileAsset rows (traceability)
  // One row per attachment URL
  if (attachments.length > 0) {
    await prisma.fileAsset.createMany({
      data: attachments.map((url) => ({
        url,
        purpose: FilePurpose.MESSAGE_ATTACHMENT,
        ownerId: userId,
        messageId: message.id,
        // If this conversation is project-linked, keep traceability to the project too:
        projectId: convo.projectId ?? null,
      })),
    })
  }

  return NextResponse.json({ ok: true, message })
}
