import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const runtime = "nodejs" // IMPORTANT: AWS SDK needs node runtime

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { filename, contentType } = body as { filename?: string; contentType?: string }

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 })
  }

  // Basic safety: allow only images
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads allowed" }, { status: 400 })
  }

  const bucket = process.env.S3_BUCKET_NAME!
  const publicBase = process.env.S3_PUBLIC_BASE_URL!

  // Put files under a public prefix + user folder
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const key = `public/portfolio/${session.user.id}/${Date.now()}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60, unhoistableHeaders: new Set(["x-amz-checksum-crc32"]), }) // 60 seconds

  const publicUrl = `${publicBase}/${key}`

  return NextResponse.json({ uploadUrl, publicUrl, key })
}
