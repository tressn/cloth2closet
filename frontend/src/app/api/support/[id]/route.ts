import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const ALLOWED_STATUSES = new Set(["OPEN", "IN_PROGRESS", "CLOSED"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return bad("Not authenticated", 401);
  if (session.user.role !== "ADMIN") return bad("Forbidden", 403);

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const status =
    typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";

  if (!ALLOWED_STATUSES.has(status)) {
    return bad("Invalid status");
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return bad("Support ticket not found", 404);
  }

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { status: status as "OPEN" | "IN_PROGRESS" | "CLOSED" },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, ticket });
}