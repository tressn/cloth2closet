import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { checkSuspended } from "@/lib/checkSuspended";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function allowUnpaidReviewsForDev() {
  return process.env.ALLOW_UNPAID_REVIEWS === "true" && process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Not authenticated", 401);

  // ── SUSPENSION BLOCK ──
  const blocked = await checkSuspended(userId);
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON body");

  const projectId = String(body.projectId ?? "");
  const rating = Number(body.rating);
  const text = (body.text ?? "").toString().trim();
  const photoUrls: string[] = Array.isArray(body.photoUrls) ? body.photoUrls : [];

  if (!projectId) return bad("projectId is required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad("rating must be 1–5");
  if (text.length > 1500) return bad("text is too long (max 1500 characters)");
  if (photoUrls.length > 10) return bad("Max 10 photos");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { payment: true, review: true },
  });

  if (!project) return bad("Project not found", 404);

  if (project.customerId !== userId) return bad("Forbidden", 403);
  if (project.status !== "COMPLETED") return bad("Project must be completed");

  const paymentOk = project.payment?.status === "SUCCEEDED";
  if (!paymentOk && !allowUnpaidReviewsForDev()) {
    return bad("Payment must be settled");
  }
  if (project.review) return bad("Review already exists for this project", 409);

  const review = await prisma.review.create({
    data: {
      projectId: project.id,
      authorId: userId,
      rating,
      text: text || null,
      photoUrls,
      isVerified: true,
    },
  });

  await prisma.fileAsset.createMany({
    data: photoUrls.map((url) => ({
      url,
      purpose: "REVIEW_PHOTO" as const,
      ownerId: userId,
      reviewId: review.id,
    })),
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}