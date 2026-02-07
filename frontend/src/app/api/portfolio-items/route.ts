import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { AttireType } from "@prisma/client"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { title, attireType, tags, description, isFeatured, imageUrls } = body

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  // Find the current user's dressmaker profile
  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json(
      { error: "Dressmaker profile not found. Visit /become-dressmaker first." },
      { status: 400 }
    )
  }

  // Validate attireType against the enum
  const safeAttireType: AttireType =
    typeof attireType === "string" && (Object.values(AttireType) as string[]).includes(attireType)
      ? (attireType as AttireType)
      : AttireType.OTHER

  const safeTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : []

  const safeImageUrls = Array.isArray(imageUrls)
  ? imageUrls.map((u) => String(u).trim()).filter(Boolean)
  : []
  
  const safeDescription =
    typeof description === "string" && description.trim().length > 0
      ? description.trim()
      : null

  const safeIsFeatured = typeof isFeatured === "boolean" ? isFeatured : false

  const item = await prisma.portfolioItem.create({
    data: {
      dressmakerId: profile.id,
      title: title.trim(),
      attireType: safeAttireType,
      tags: safeTags,
      imageUrls: safeImageUrls,
      description: safeDescription,
      isFeatured: safeIsFeatured,
    },
  })

  return NextResponse.json({ ok: true, item })
}
