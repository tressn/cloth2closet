import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

type AllowedRole = "CUSTOMER" | "DRESSMAKER";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return bad("Unauthorized", 401);

  const form = await req.formData();
  const roleRaw = form.get("role");

  if (typeof roleRaw !== "string") return bad("role is required");

  if (roleRaw !== "CUSTOMER" && roleRaw !== "DRESSMAKER") {
    return bad("Invalid role");
  }

  const role = roleRaw as AllowedRole;

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (existing?.role && existing.role !== role) {
    return bad("Role is already set. Contact support to change it.", 409);
  }

  if (role === "DRESSMAKER") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "DRESSMAKER",
        dressmakerProfile: {
          upsert: {
            create: { languages: [], currency: "USD" },
            update: {},
          },
        },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "CUSTOMER",
        customerProfile: {
          upsert: { create: {}, update: {} },
        },
      },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
}
