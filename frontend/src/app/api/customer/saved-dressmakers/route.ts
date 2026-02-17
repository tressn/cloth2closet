import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const dressmakerProfileId = asString(body?.dressmakerProfileId);
    if (!dressmakerProfileId) {
      return NextResponse.json({ error: "dressmakerProfileId required" }, { status: 400 });
    }

    await prisma.savedDressmaker.upsert({
      where: {
        customerId_dressmakerProfileId: {
          customerId: session.user.id,
          dressmakerProfileId,
        },
      },
      create: {
        customerId: session.user.id,
        dressmakerProfileId,
      },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const dressmakerProfileId = asString(body?.dressmakerProfileId);
    if (!dressmakerProfileId) {
      return NextResponse.json({ error: "dressmakerProfileId required" }, { status: 400 });
    }

    // Idempotent: won’t throw if already unsaved
    await prisma.savedDressmaker.deleteMany({
      where: {
        customerId: session.user.id,
        dressmakerProfileId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
