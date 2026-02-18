import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function normalizeLabel(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function GET() {
  const labels = await prisma.label.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, labels });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role ?? null;

  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (role !== "DRESSMAKER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only dressmakers can propose labels" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body?.name === "string" ? body.name : "";
  const name = normalizeLabel(raw);

  if (!name || name.length < 2) return NextResponse.json({ error: "Label name is too short" }, { status: 400 });

  const existing = await prisma.label.findUnique({ where: { name } });
  if (existing) return NextResponse.json({ ok: true, created: false, label: existing });

  const created = await prisma.label.create({
    data: { name, status: "PENDING", createdById: userId },
  });

  return NextResponse.json({ ok: true, created: true, label: created });
}
