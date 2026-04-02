import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { CURRENCY_SET } from "@/lib/lookup/currencies";
import { COUNTRY_SET } from "@/lib/lookup/countries";

const LANGUAGE_SET = new Set(["en", "fr", "es", "de", "it", "pt"]);

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugify(name: string) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id; // ✅ define once

  const body = await req.json().catch(() => ({} as any));

  const countryCode =
    typeof body.countryCode === "string" ? body.countryCode.trim().toUpperCase() : "";

  const timezoneIana =
    typeof body.timezoneIana === "string" ? body.timezoneIana.trim() : "";

  if (countryCode && !COUNTRY_SET.has(countryCode)) {
    return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  }

  const safeDisplayName =
    typeof body.displayName === "string" && body.displayName.trim().length
      ? body.displayName.trim()
      : null;

  // basePriceFrom is dollars (Int). Keep it an integer.
  const safeBasePriceFrom =
    typeof body.basePriceFrom === "number" && Number.isFinite(body.basePriceFrom)
      ? Math.max(0, Math.trunc(body.basePriceFrom))
      : null;

  const safeYearsExperience =
    typeof body.yearsExperience === "number" && Number.isFinite(body.yearsExperience)
      ? Math.max(0, Math.trunc(body.yearsExperience))
      : null;

  const currency =
    typeof body.currency === "string" && body.currency.trim().length
      ? body.currency.trim().toUpperCase()
      : "USD";

  if (!CURRENCY_SET.has(currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const languageCodes: string[] = Array.isArray(body.languageCodes)
    ? body.languageCodes
        .map((x: any) => String(x).trim().toLowerCase())
        .filter(Boolean)
    : [];

  const invalidLangs = languageCodes.filter((c) => !LANGUAGE_SET.has(c));
  if (invalidLangs.length) {
    return NextResponse.json(
      { error: `Invalid languages: ${invalidLangs.join(", ")}` },
      { status: 400 }
    );
  }

  const safeSpecialties = Array.isArray(body.specialties)
    ? body.specialties.map((x: any) => normalizeName(String(x))).filter(Boolean)
    : [];

  const safeWebsiteUrl =
    typeof body.websiteUrl === "string" && body.websiteUrl.trim().length
      ? body.websiteUrl.trim()
      : null;

  const safeInstagramHandle =
    typeof body.instagramHandle === "string" && body.instagramHandle.trim().length
      ? body.instagramHandle.trim().replace(/^@/, "")
      : null;

  const safeTiktokHandle =
    typeof body.tiktokHandle === "string" && body.tiktokHandle.trim().length
      ? body.tiktokHandle.trim().replace(/^@/, "")
      : null;

  // ✅ read existing socialLinks so we don't wipe other keys
  const existing = await prisma.dressmakerProfile.findUnique({
    where: { userId },
    select: { socialLinks: true },
  });

  const prev = (existing?.socialLinks ?? {}) as Record<string, unknown>;

  // ✅ update profile + socialLinks.tiktok
  const updated = await prisma.dressmakerProfile.update({
    where: { userId },
    data: {
      displayName: safeDisplayName,
      bio: typeof body.bio === "string" ? body.bio : null,

      countryCode: countryCode || null,
      timezoneIana: timezoneIana || null,

      languages: languageCodes,

      basePriceFrom: safeBasePriceFrom,
      currency,
      yearsExperience: safeYearsExperience,

      websiteUrl: safeWebsiteUrl,
      instagramHandle: safeInstagramHandle,

      // ✅ THIS WAS MISSING
      socialLinks: {
        ...prev,
        tiktok: safeTiktokHandle || null,
      },
    },
    select: { id: true },
  });

  // reset + recreate specialties
  await prisma.dressmakerSpecialty.deleteMany({
    where: { dressmakerProfileId: updated.id },
  });

  for (const s of safeSpecialties) {
    const slug = slugify(s);
    if (!slug) continue;

    const label = await prisma.label.upsert({
      where: { scope_slug: { scope: "SPECIALTY", slug } },
      update: {},
      create: {
        name: s,
        slug,
        scope: "SPECIALTY",
        status: "PENDING",
        createdById: userId,
      },
    });

    await prisma.dressmakerSpecialty.create({
      data: { dressmakerProfileId: updated.id, labelId: label.id },
    });
  }

  return NextResponse.json({ ok: true });
}