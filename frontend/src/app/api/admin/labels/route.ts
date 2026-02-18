import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function normalizeLabel(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type Action = "APPROVE" | "REJECT" | "RENAME" | "RENAME_APPROVE";

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
    const updated = await prisma.label.update({ where: { id }, data: { status: "REJECTED" } });
    return NextResponse.json({ ok: true, label: updated });
  }

  const rawName = typeof body?.name === "string" ? body.name : "";
  const nextName = normalizeLabel(rawName);

  if (!nextName || nextName.length < 2) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const existing = await prisma.label.findUnique({ where: { name: nextName } });
  if (existing && existing.id !== id) {
    return NextResponse.json({ error: "A label with that name already exists" }, { status: 409 });
  }

  if (action === "RENAME") {
    const updated = await prisma.label.update({ where: { id }, data: { name: nextName } });
    return NextResponse.json({ ok: true, label: updated });
  }

  const updated = await prisma.label.update({
    where: { id },
    data: { name: nextName, status: "APPROVED" },
  });

  return NextResponse.json({ ok: true, label: updated });
}
