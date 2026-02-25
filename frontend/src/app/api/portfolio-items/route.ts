import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { AttireType, LabelScope, LabelStatus } from "@prisma/client";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugify(name: string) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function parseAttireType(value: unknown): AttireType {
  if (typeof value !== "string") return AttireType.OTHER;
  const normalized = value.toUpperCase();
  const allowed = Object.values(AttireType) as string[];
  return allowed.includes(normalized) ? (normalized as AttireType) : AttireType.OTHER;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const attireType = parseAttireType(body?.attireType);
  const description =
    typeof body?.description === "string" && body.description.trim().length > 0 ? body.description.trim() : null;
  const isFeatured = typeof body?.isFeatured === "boolean" ? body.isFeatured : false;

  const imageUrls: string[] = Array.isArray(body?.imageUrls)
    ? body.imageUrls.map((u: any) => String(u).trim()).filter(Boolean).slice(0, 10)
    : [];

  // Dedupe + cap tags
  const rawTags: string[] = Array.isArray(body?.tags) ? body.tags.map((t: any) => normalizeName(String(t))) : [];
  const safeTags = Array.from(new Set(rawTags.filter(Boolean))).slice(0, 20);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (imageUrls.length === 0) return NextResponse.json({ error: "At least 1 image is required" }, { status: 400 });

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Dressmaker profile not found. Visit /become-dressmaker first." },
      { status: 400 }
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    // 1) Create the portfolio item
    const item = await tx.portfolioItem.create({
      data: {
        dressmakerId: profile.id,
        title,
        attireType,
        imageUrls,
        description,
        isFeatured,
      },
      select: { id: true },
    });

    if (safeTags.length) {
      // 2) Upsert labels (scope=PORTFOLIO) and attach
      const labelIds: string[] = [];

      for (const t of safeTags) {
        const slug = slugify(t);
        if (!slug) continue;

        const label = await tx.label.upsert({
          where: { scope_slug: { scope: LabelScope.PORTFOLIO, slug } }, // relies on @@unique([scope, slug])
          update: {
            // optional: keep name fresh (nice casing) without changing approval state
            name: t,
          },
          create: {
            name: t,
            slug,
            scope: LabelScope.PORTFOLIO,
            status: LabelStatus.PENDING,
            createdById: session.user.id,
          },
          select: { id: true },
        });

        labelIds.push(label.id);
      }

      if (labelIds.length) {
        await tx.portfolioItemLabel.createMany({
          data: labelIds.map((labelId) => ({
            portfolioItemId: item.id,
            labelId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return item;
  });

  return NextResponse.json({ ok: true, itemId: created.id });
}