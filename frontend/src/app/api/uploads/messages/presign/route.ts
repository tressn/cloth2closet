import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const runtime = "nodejs"

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const { filename, contentType, conversationId } = body as {
    filename?: string
    contentType?: string
    conversationId?: string
  }

  if (!filename || !contentType || !conversationId) {
    return NextResponse.json({ error: "filename, contentType, conversationId required" }, { status: 400 })
  }

  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads allowed" }, { status: 400 })
  }

  // ✅ Authorization: must be part of the conversation
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } })
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const userId = session.user.id
  const isMember = convo.customerId === userId || convo.dressmakerId === userId || session.user.role === "ADMIN"
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const bucket = process.env.S3_BUCKET_NAME!
  const publicBase = process.env.S3_PUBLIC_BASE_URL!

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `public/messages/${conversationId}/${userId}/${Date.now()}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60, unhoistableHeaders: new Set(["x-amz-checksum-crc32"]), })
  const publicUrl = `${publicBase}/${key}`

  return NextResponse.json({ uploadUrl, publicUrl, key })
}
