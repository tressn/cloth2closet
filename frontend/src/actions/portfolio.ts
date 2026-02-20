"use server";

import { prisma } from "@/lib/prisma";
import { requireDressmaker } from "@/lib/requiredRole";
import { AttireType } from "@prisma/client";

function parseAttireType(value: unknown): AttireType {
  if (typeof value !== "string") return AttireType.OTHER;

  // If your UI sends lowercase like "dress", normalize.
  const normalized = value.toUpperCase();

  const allowed = Object.values(AttireType) as string[];
  if (allowed.includes(normalized)) return normalized as AttireType;

  return AttireType.OTHER;
}

export async function createPortfolioItemAction(data: {
  title: string;
  attireType: string; // coming from form
  tags: string[];
  imageUrls: string[];
}) {
  const user = await requireDressmaker();

  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!dressmaker) throw new Error("No dressmaker profile");

  return prisma.portfolioItem.create({
    data: {
      dressmakerId: dressmaker.id,
      title: data.title,
      attireType: parseAttireType(data.attireType),
      tags: data.tags,
      imageUrls: data.imageUrls,
    },
  });
}