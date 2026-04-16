import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { AttireType, LabelScope, LabelStatus } from "@prisma/client";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function parseAttireType(value: unknown): AttireType {
  if (typeof value !== "string") return AttireType.OTHER;
  const normalized = value.toUpperCase();
  const allowed = Object.values(AttireType) as string[];
  return allowed.includes(normalized) ? (normalized as AttireType) : AttireType.OTHER;
}

function asUrlArray(v: unknown, max = 10) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const item = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { id: true, dressmaker: { select: { userId: true } } },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = item.dressmaker?.userId === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.portfolioItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Load item + ownership
  const existing = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { id: true, dressmaker: { select: { userId: true } } },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = existing.dressmaker?.userId === session.user.id;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Optional fields (PATCH semantics)
  const nextTitle = typeof body?.title === "string" ? body.title.trim() : undefined;
  if (nextTitle !== undefined && nextTitle.length === 0) {
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  const nextAttireType = body?.attireType !== undefined ? parseAttireType(body.attireType) : undefined;

  const nextDescription =
    body?.description === undefined
      ? undefined
      : body.description === null
        ? null
        : typeof body.description === "string"
          ? body.description.trim() || null
          : undefined;

  const nextIsFeatured = typeof body?.isFeatured === "boolean" ? body.isFeatured : undefined;

  // If you want editing images from the edit form, send imageUrls and this will update them.
  const nextImageUrls = body?.imageUrls !== undefined ? asUrlArray(body.imageUrls, 10) : undefined;

  // labelIds -> join-table
  const nextLabelIds: string[] | undefined =
    body?.labelIds === undefined
      ? undefined
      : (() => {
          const raw: unknown[] = Array.isArray(body.labelIds) ? body.labelIds : [];
          const cleaned = raw
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter((x): x is string => x.length > 0);
          return Array.from(new Set(cleaned)).slice(0, 20);
        })();

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.portfolioItem.update({
      where: { id },
      data: {
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(nextAttireType !== undefined ? { attireType: nextAttireType } : {}),
        ...(nextDescription !== undefined ? { description: nextDescription } : {}),
        ...(nextIsFeatured !== undefined ? { isFeatured: nextIsFeatured } : {}),
        ...(nextImageUrls !== undefined ? { imageUrls: nextImageUrls } : {}),
      },
    });

    if (nextLabelIds !== undefined) {

      const existingLabels = await tx.label.findMany({
        where: {
          id: { in: nextLabelIds },
          scope: LabelScope.PORTFOLIO,
          status: { in: [LabelStatus.APPROVED, LabelStatus.PENDING] },
        },
        select: { id: true },
      });

      const attachIds = existingLabels.map((l) => l.id);

      // Replace joins
      if (attachIds.length === 0) {
        await tx.portfolioItemLabel.deleteMany({ where: { portfolioItemId: id } });
      } else {
        await tx.portfolioItemLabel.deleteMany({
          where: { portfolioItemId: id, NOT: { labelId: { in: attachIds } } },
        });

        await tx.portfolioItemLabel.createMany({
          data: attachIds.map((labelId) => ({ portfolioItemId: id, labelId })),
          skipDuplicates: true,
        });
      }
    }

    return item;
  });

  return NextResponse.json({ ok: true, item: updated });
}