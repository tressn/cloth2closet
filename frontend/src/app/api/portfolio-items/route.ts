import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireDressmaker } from "@/lib/requireRole"

export async function POST(req: Request) {
  const user = await requireDressmaker()
  const body = await req.json()

  const { title, attireType, tags, imageUrls } = body

  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!dressmaker) {
    return NextResponse.json({ error: "No dressmaker profile" }, { status: 400 })
  }

  const item = await prisma.portfolioItem.create({
    data: {
      dressmakerId: dressmaker.id,
      title,
      attireType,
      tags,
      imageUrls,
    },
  })

  return NextResponse.json(item)
}
