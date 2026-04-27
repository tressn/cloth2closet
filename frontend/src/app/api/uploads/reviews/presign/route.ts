import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },

  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Not authenticated", 401);

  const body = await req.json().catch(() => ({}));
  const { filename, contentType, projectId } = body as {
    filename?: string;
    contentType?: string;
    projectId?: string;
  };

  if (!filename || !contentType || !projectId) {
    return bad("filename, contentType, and projectId required");
  }

  if (!contentType.startsWith("image/")) {
    return bad("Only image uploads allowed");
  }

  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
  if (!allowed.has(contentType)) return bad("Unsupported image type");

  // ✅ Authorization: must be project owner + eligible to review
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { payment: true, review: true },
  });

  if (!project) return bad("Project not found", 404);
  if (project.customerId !== userId) return bad("Forbidden", 403);
  if (project.review) return bad("Review already exists", 409);
  if (project.status !== "COMPLETED") return bad("Project must be completed", 400);
  if (!project.payment || project.payment.status !== "SUCCEEDED") {
    return bad("Payment must be settled", 400);
  }

  const bucket = process.env.S3_BUCKET_NAME!;
  const publicBase = process.env.S3_PUBLIC_BASE_URL!;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `public/reviews/${projectId}/${userId}/${Date.now()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60, unhoistableHeaders: new Set(["x-amz-checksum-crc32"]), });
  const publicUrl = `${publicBase}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
