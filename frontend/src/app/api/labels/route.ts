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
  if (value === "PROJECT" || value === "PORTFOLIO" || value === "SPECIALTY") {
    return value;
  }
  return fallback;
}

function parseScopes(values: string[]): Scope[] {
  const valid = values
    .map((value) => parseScope(value, "PORTFOLIO"))
    .filter((value, index, arr) => arr.indexOf(value) === index);

  return valid.length > 0 ? valid : ["PORTFOLIO"];
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const role = session?.user?.role ?? null;

  const url = new URL(req.url);
  const scopes = parseScopes(url.searchParams.getAll("scope"));
  const includePending = url.searchParams.get("includePending") === "1";

  const scopeWhere =
    scopes.length === 1 ? scopes[0] : { in: scopes };

  const where =
    includePending && (role === "DRESSMAKER" || role === "ADMIN")
      ? {
          scope: scopeWhere,
          OR: [
            { status: "APPROVED" as const },
            {
              status: "PENDING" as const,
              createdById: userId ?? undefined,
            },
          ],
        }
      : {
          scope: scopeWhere,
          status: "APPROVED" as const,
        };

  const labels = await prisma.label.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      scope: true,
    },
  });

  return NextResponse.json({ ok: true, labels });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (role !== "DRESSMAKER" && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only dressmakers can propose labels" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const scope = parseScope(body?.scope, "PORTFOLIO");
  const raw = typeof body?.name === "string" ? body.name : "";

  const name = normalizeName(raw);
  const slug = slugify(name);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Label name is too short" }, { status: 400 });
  }

  if (!slug) {
    return NextResponse.json({ error: "Label name is invalid" }, { status: 400 });
  }

  const existing = await prisma.label.findUnique({
    where: { scope_slug: { scope, slug } },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      scope: true,
    },
  });

  if (existing) {
    return NextResponse.json({ ok: true, created: false, label: existing });
  }

  const created = await prisma.label.create({
    data: {
      name,
      slug,
      scope,
      status: "PENDING",
      createdById: userId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      scope: true,
    },
  });

  return NextResponse.json({ ok: true, created: true, label: created });
}