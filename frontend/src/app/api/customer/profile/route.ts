import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json();

  // Very light validation (you can expand later)
  if (body.username && typeof body.username !== "string") {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    // Update user basic fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        username: body.username?.trim() || null,
        name: body.name?.trim() || null,
      },
    });

    // Upsert customer profile
    await prisma.customerProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: body.fullName?.trim() || null,
        phone: body.phone?.trim() || null,
        timezone: body.timezone?.trim() || null,
        address1: body.address1?.trim() || null,
        address2: body.address2?.trim() || null,
        city: body.city?.trim() || null,
        region: body.region?.trim() || null,
        postalCode: body.postalCode?.trim() || null,
        country: body.country?.trim() || null,
      },
      update: {
        fullName: body.fullName?.trim() || null,
        phone: body.phone?.trim() || null,
        timezone: body.timezone?.trim() || null,
        address1: body.address1?.trim() || null,
        address2: body.address2?.trim() || null,
        city: body.city?.trim() || null,
        region: body.region?.trim() || null,
        postalCode: body.postalCode?.trim() || null,
        country: body.country?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Username uniqueness errors will land here
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
