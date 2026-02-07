import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { AttireType } from "@prisma/client"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // Only allow deleting items owned by the current dressmaker
  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json({ error: "Dressmaker profile not found" }, { status: 400 })
  }

  const item = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { id: true, dressmakerId: true },
  })

  if (!item || item.dressmakerId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.portfolioItem.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const { title, attireType, tags, description, isFeatured } = body

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json({ error: "Dressmaker profile not found" }, { status: 400 })
  }

  const existing = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { id: true, dressmakerId: true },
  })

  if (!existing || existing.dressmakerId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const safeTitle =
    typeof title === "string" && title.trim().length > 0 ? title.trim() : null
  if (!safeTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const safeAttireType: AttireType =
    typeof attireType === "string" && (Object.values(AttireType) as string[]).includes(attireType)
      ? (attireType as AttireType)
      : AttireType.OTHER

  const safeTags = Array.isArray(tags)
    ? tags.map((t) => String(t).trim()).filter(Boolean)
    : []

  const safeDescription =
    typeof description === "string" && description.trim().length > 0
      ? description.trim()
      : null

  const safeIsFeatured = typeof isFeatured === "boolean" ? isFeatured : false

  const updated = await prisma.portfolioItem.update({
    where: { id },
    data: {
      title: safeTitle,
      attireType: safeAttireType,
      tags: safeTags,
      description: safeDescription,
      isFeatured: safeIsFeatured,
    },
  })

  return NextResponse.json({ ok: true, item: updated })
}

