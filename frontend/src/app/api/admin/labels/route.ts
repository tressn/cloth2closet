import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

type Action = "APPROVE" | "REJECT" | "RENAME" | "RENAME_APPROVE";

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
function slugify(name: string) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action as Action;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  const label = await prisma.label.findUnique({ where: { id } });
  if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

  if (action === "APPROVE") {
    const updated = await prisma.label.update({ where: { id }, data: { status: "APPROVED" } });
    return NextResponse.json({ ok: true, label: updated });
  }

  if (action === "REJECT") {
    const updated = await prisma.$transaction(async (tx) => {
      const labelUpdated = await tx.label.update({
        where: { id },
        data: { status: "REJECTED" },
      });

      // remove from attachments (MVP behavior)
      await tx.portfolioItemLabel.deleteMany({ where: { labelId: id } });
      await tx.dressmakerSpecialty.deleteMany({ where: { labelId: id } });
      // later if needed:
      // await tx.projectLabel.deleteMany({ where: { labelId: id } });

      return labelUpdated;
    });

    return NextResponse.json({ ok: true, label: updated });
  }

  const raw = typeof body?.name === "string" ? body.name : "";
  const nextName = normalizeName(raw);
  const nextSlug = slugify(nextName);

  if (!nextName || nextName.length < 2) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!nextSlug) return NextResponse.json({ error: "invalid name" }, { status: 400 });

  // unique by scope+slug (uses your @@unique([scope, slug]) constraint)
  const existing = await prisma.label.findUnique({
    where: { scope_slug: { scope: label.scope, slug: nextSlug } },
  });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "That label already exists" }, { status: 409 });
  }

  if (action === "RENAME") {
    const updated = await prisma.label.update({
      where: { id },
      data: { name: nextName, slug: nextSlug },
    });
    return NextResponse.json({ ok: true, label: updated });
  }

  // RENAME_APPROVE
  const updated = await prisma.label.update({
    where: { id },
    data: { name: nextName, slug: nextSlug, status: "APPROVED" },
  });
  return NextResponse.json({ ok: true, label: updated });
}