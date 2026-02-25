import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

type Scope = "PROJECT" | "PORTFOLIO" | "SPECIALTY";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}
function slugify(name: string) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}
function parseScope(value: unknown, fallback: Scope): Scope {
  if (value === "PROJECT" || value === "PORTFOLIO" || value === "SPECIALTY") return value;
  return fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"), "PORTFOLIO");

  const labels = await prisma.label.findMany({
    where: { status: "APPROVED", scope },
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
  const scope = parseScope(body?.scope, "PORTFOLIO");
  const raw = typeof body?.name === "string" ? body.name : "";

  const name = normalizeName(raw);
  const slug = slugify(name);

  if (!name || name.length < 2) return NextResponse.json({ error: "Label name is too short" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Label name is invalid" }, { status: 400 });

  const existing = await prisma.label.findUnique({
    where: { scope_slug: { scope, slug } }, // works after @@unique([scope, slug])
  });

  if (existing) return NextResponse.json({ ok: true, created: false, label: existing });

  const created = await prisma.label.create({
    data: { name, slug, scope, status: "PENDING", createdById: userId },
  });

  return NextResponse.json({ ok: true, created: true, label: created });
}