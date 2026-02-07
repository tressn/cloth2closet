import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, PaymentStatus } from "@prisma/client"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const { projectId, rating, text } = body

  if (typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId required" }, { status: 400 })
  }

  const r = Number(rating)
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "rating must be 1..5" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { payment: true, review: true },
  })

  if (!project || project.customerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (project.review) {
    return NextResponse.json({ error: "Review already exists for this project" }, { status: 400 })
  }

  if (project.status !== ProjectStatus.COMPLETED) {
    return NextResponse.json({ error: "Project must be COMPLETED to review" }, { status: 400 })
  }

  // recommended rule:
  if (!project.payment || project.payment.status !== PaymentStatus.SUCCEEDED) {
    return NextResponse.json({ error: "Payment must be SUCCEEDED to review" }, { status: 400 })
  }

  const review = await prisma.review.create({
    data: {
      projectId,
      rating: Math.trunc(r),
      text: typeof text === "string" && text.trim() ? text.trim() : null,
      photoUrls: [],
    },
  })

  return NextResponse.json({ ok: true, review })
}
