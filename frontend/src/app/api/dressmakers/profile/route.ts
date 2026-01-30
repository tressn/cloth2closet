import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()

  const {
    displayName,
    bio,
    location,
    languages,
    basePriceFrom,
    currency,
    yearsExperience,
    specialties,
    websiteUrl,
    instagramHandle,
  } = body

  // Light validation (beginner-friendly)
  const safeDisplayName =
    typeof displayName === "string" ? displayName.trim() : null

  const safeLanguages = Array.isArray(languages)
    ? languages.map((x) => String(x).trim()).filter(Boolean)
    : []

  const safeSpecialties = Array.isArray(specialties)
    ? specialties.map((x) => String(x).trim()).filter(Boolean)
    : []

  const safeBasePriceFrom =
    typeof basePriceFrom === "number" && Number.isFinite(basePriceFrom)
      ? Math.max(0, Math.trunc(basePriceFrom))
      : null

  const safeYearsExperience =
    typeof yearsExperience === "number" && Number.isFinite(yearsExperience)
      ? Math.max(0, Math.trunc(yearsExperience))
      : null

  const safeCurrency =
    typeof currency === "string" && currency.trim().length > 0
      ? currency.trim().toUpperCase()
      : "USD"

  const safeWebsiteUrl =
    typeof websiteUrl === "string" && websiteUrl.trim().length > 0
      ? websiteUrl.trim()
      : null

  const safeInstagramHandle =
    typeof instagramHandle === "string" && instagramHandle.trim().length > 0
      ? instagramHandle.trim().replace(/^@/, "") // store without @
      : null

  const updated = await prisma.dressmakerProfile.update({
    where: { userId: session.user.id },
    data: {
      displayName: safeDisplayName,
      bio: typeof bio === "string" ? bio : null,
      location: typeof location === "string" ? location : null,
      languages: safeLanguages,
      basePriceFrom: safeBasePriceFrom,
      currency: safeCurrency,
      yearsExperience: safeYearsExperience,
      specialties: safeSpecialties,
      websiteUrl: safeWebsiteUrl,
      instagramHandle: safeInstagramHandle,
    },
  })

  return NextResponse.json({ ok: true, profile: updated })
}
