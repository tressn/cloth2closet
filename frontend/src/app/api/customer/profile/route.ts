import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { COUNTRY_SET } from "@/lib/lookup/countries";
import { SUBDIVISION_SET_BY_COUNTRY } from "@/lib/lookup/subdivisions";
import { TIMEZONE_SET } from "@/lib/lookup/timezones";

type PatchBody = Partial<{
  username: string;
  name: string;
  fullName: string;
  phone: string;
  timezoneIana: string;
  address1: string;
  address2: string;
  postalCode: string;
  countryCode: string;
  subdivisionCode: string;
}>;

const asTrimmedString = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : "";
};

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const body: PatchBody = await req.json().catch(() => ({}));

  // Normalize inputs
  const username = asTrimmedString(body.username);
  const name = asTrimmedString(body.name);
  const fullName = asTrimmedString(body.fullName);
  const phone = asTrimmedString(body.phone);
  const timezoneIana = asTrimmedString(body.timezoneIana);
  const address1 = asTrimmedString(body.address1);
  const address2 = asTrimmedString(body.address2);
  const postalCode = asTrimmedString(body.postalCode);

  const countryCodeRaw = asTrimmedString(body.countryCode);
  const subdivisionCodeRaw = asTrimmedString(body.subdivisionCode);

  const countryCode = countryCodeRaw ? countryCodeRaw.toUpperCase() : "";
  const subdivisionCode = subdivisionCodeRaw ? subdivisionCodeRaw.toUpperCase() : "";

  // ✅ timezone validation
  if (timezoneIana && !TIMEZONE_SET.some((t) => t.value === timezoneIana)) {
  return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
}

  // ✅ country validation
  if (countryCode && !COUNTRY_SET.has(countryCode)) {
    return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  }

  // ✅ subdivision validation (only if provided)
  if (subdivisionCode) {
    if (!countryCode) {
      return NextResponse.json(
        { error: "Country is required when selecting a state/province" },
        { status: 400 }
      );
    }
    const set = SUBDIVISION_SET_BY_COUNTRY[countryCode];
    if (!set || !set.has(subdivisionCode)) {
      return NextResponse.json(
        { error: "Invalid state/province for selected country" },
        { status: 400 }
      );
    }
  }

  // Build PATCH updates without accidentally blanking things
  const userUpdate: Record<string, any> = {};
  if (body.username !== undefined) userUpdate.username = username || null;
  if (body.name !== undefined) userUpdate.name = name || null;

  const profileData: Record<string, any> = {};
  if (body.fullName !== undefined) profileData.fullName = fullName || null;
  if (body.phone !== undefined) profileData.phone = phone || null;
  if (body.timezoneIana !== undefined) profileData.timezoneIana = timezoneIana || null;
  if (body.address1 !== undefined) profileData.address1 = address1 || null;
  if (body.address2 !== undefined) profileData.address2 = address2 || null;
  if (body.postalCode !== undefined) profileData.postalCode = postalCode || null;
  if (body.countryCode !== undefined) profileData.countryCode = countryCode || null;
  if (body.subdivisionCode !== undefined) profileData.subdivisionCode = subdivisionCode || null;

  try {
    // Only hit User table if relevant fields were in the PATCH
    if (Object.keys(userUpdate).length) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    // Upsert profile (create uses same normalized fields)
    await prisma.customerProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: profileData.fullName ?? null,
        phone: profileData.phone ?? null,
        timezoneIana: profileData.timezoneIana ?? null,
        address1: profileData.address1 ?? null,
        address2: profileData.address2 ?? null,
        postalCode: profileData.postalCode ?? null,
        countryCode: profileData.countryCode ?? null,
        subdivisionCode: profileData.subdivisionCode ?? null,
      },
      update: profileData,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}