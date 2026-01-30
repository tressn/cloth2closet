"use server"

import { prisma } from "@/lib/prisma"
import { requireDressmaker } from "@/lib/requireRole"

export async function createPortfolioItemAction(data: {
  title: string
  attireType: string
  tags: string[]
  imageUrls: string[]
}) {
  const user = await requireDressmaker()

  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!dressmaker) throw new Error("No dressmaker profile")

  return prisma.portfolioItem.create({
    data: {
      dressmakerId: dressmaker.id,
      title: data.title,
      attireType: data.attireType,
      tags: data.tags,
      imageUrls: data.imageUrls,
    },
  })
}
