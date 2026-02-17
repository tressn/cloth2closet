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

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true, dressmakerId: true, projectId: true },
  })

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const isMember =
    convo.customerId === userId || convo.dressmakerId === userId || session.user.role === "ADMIN"
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  const attachmentsRaw = body?.attachments

  const attachmentsParsed: string[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((u: any) => String(u).trim()).filter(Boolean)
    : []

  // optional: dedupe
  const attachments = Array.from(new Set(attachmentsParsed))

  // ✅ validate attachment URLs BEFORE saving
  const publicBase = process.env.S3_PUBLIC_BASE_URL!
  for (const url of attachments) {
    if (!url.startsWith(publicBase)) {
      return NextResponse.json({ error: "Invalid attachment URL" }, { status: 400 })
    }
  }

  if (!text && attachments.length === 0) {
    return NextResponse.json(
      { error: "Message must include text or at least 1 attachment" },
      { status: 400 }
    )
  }

  if (attachments.length > 10) {
    return NextResponse.json({ error: "Too many attachments (max 10)" }, { status: 400 })
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      text: text || null,
      attachments,
    },
  })

  if (attachments.length > 0) {
    await prisma.fileAsset.createMany({
      data: attachments.map((url) => ({
        url,
        purpose: FilePurpose.MESSAGE_ATTACHMENT,
        ownerId: userId,
        messageId: message.id,
        projectId: convo.projectId ?? null,
      })),
    })
  }

  return NextResponse.json({ ok: true, message })
}
