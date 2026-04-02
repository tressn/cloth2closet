"use server";

import { prisma } from "@/lib/prisma";
import { requireDressmaker } from "@/lib/requiredRole";
import { AttireType, LabelScope, LabelStatus } from "@prisma/client";

function parseAttireType(value: unknown): AttireType {
  if (typeof value !== "string") return AttireType.OTHER;
  const normalized = value.toUpperCase();
  const allowed = Object.values(AttireType) as string[];
  if (allowed.includes(normalized)) return normalized as AttireType;
  return AttireType.OTHER;
}

function slugifyTag(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

  const rawTags = Array.isArray(data.tags) ? data.tags : [];
  const tagNames = rawTags
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter(Boolean);

  // de-dupe by slug (prevents unique collisions + duplicates)
  const tags = Array.from(
    new Map(tagNames.map((name) => [slugifyTag(name), name])).entries()
  )
    .map(([slug, name]) => ({ slug, name }))
    .filter((t) => t.slug.length > 0);

  return prisma.portfolioItem.create({
    data: {
      dressmakerId: dressmaker.id,
      title: data.title,
      attireType: parseAttireType(data.attireType),
      imageUrls: data.imageUrls,

      // ✅ replace "tags" with join rows
      ...(tags.length
        ? {
            portfolioItemLabels: {
              create: tags.map((t) => ({
                label: {
                  connectOrCreate: {
                    where: {
                      scope_slug: {
                        scope: LabelScope.PORTFOLIO,
                        slug: t.slug,
                      },
                    },
                    create: {
                      scope: LabelScope.PORTFOLIO,
                      slug: t.slug,
                      name: t.name,
                      status: LabelStatus.PENDING, // matches your approval workflow
                      createdById: user.id,
                    },
                  },
                },
              })),
            },
          }
        : {}),
    },
  });
}