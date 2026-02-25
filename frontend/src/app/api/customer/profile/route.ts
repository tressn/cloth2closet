import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { COUNTRY_SET } from "@/lib/lookup/countries";
import { SUBDIVISIONS_BY_COUNTRY } from "@/lib/lookup/subdivisions";
import { TIMEZONES } from "@/lib/lookup/timezones";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  const countryCode =
    typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";

  const subdivisionCode =
    typeof body.subdivisionCode === "string" ? body.subdivisionCode.trim().toUpperCase() : "";

  const timezoneIana =
    typeof body.timezoneIana === "string" ? body.timezoneIana.trim() : "";


  if (timezoneIana && !TIMEZONES.has(timezoneIana)) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  // ✅ country validation
  if (countryCode && !COUNTRY_SET.has(countryCode)) {
    return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  }

  // ✅ subdivision validation (only if provided)
  if (subdivisionCode) {
    if (!countryCode) {
      return NextResponse.json({ error: "Country is required when selecting a state/province" }, { status: 400 });
    }
    const set = SUBDIVISIONS_BY_COUNTRY[countryCode];
    if (!set || !set.has(subdivisionCode)) {
      return NextResponse.json(
        { error: "Invalid state/province for selected country" },
        { status: 400 }
      );
    }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        username: username || null,
        name: name || null,
      },
    });

    await prisma.customerProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: typeof body.fullName === "string" ? body.fullName.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,

        timezoneIana: timezoneIana || null,

        address1: typeof body.address1 === "string" ? body.address1.trim() || null : null,
        address2: typeof body.address2 === "string" ? body.address2.trim() || null : null,
        postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() || null : null,

        countryCode: countryCode || null,
        subdivisionCode: subdivisionCode || null,
      },
      update: {
        fullName: typeof body.fullName === "string" ? body.fullName.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,

        timezoneIana: timezoneIana || null,

        address1: typeof body.address1 === "string" ? body.address1.trim() || null : null,
        address2: typeof body.address2 === "string" ? body.address2.trim() || null : null,
        postalCode: typeof body.postalCode === "string" ? body.postalCode.trim() || null : null,

        countryCode: countryCode || null,
        subdivisionCode: subdivisionCode || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}