import { prisma } from "@/lib/prisma"

export default async function DressmakersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  const q = getFirst(sp.q)?.trim() ?? ""
  const location = getFirst(sp.location)?.trim() ?? ""
  const language = getFirst(sp.language)?.trim() ?? ""
  const minPriceRaw = getFirst(sp.minPrice)?.trim() ?? ""
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined

  const where: any = {
    isPublished: true, isPaused: false
  }

  // "q" search across a few text fields
  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
      { specialties: { has: q } }, // exact match item in array
    ]
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" }
  }

  if (language) {
    where.languages = { has: language }
  }

  if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
    where.basePriceFrom = { gte: Math.max(0, Math.trunc(minPrice)) }
  }

  const dressmakers = await prisma.dressmakerProfile.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      displayName: true,
      location: true,
      basePriceFrom: true,
      currency: true,
      yearsExperience: true,
      languages: true,
      specialties: true,
    },
  })

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>Dressmakers</h1>

      <SearchBar
        initial={{
          q,
          location,
          language,
          minPrice: minPriceRaw,
        }}
      />

      <p style={{ marginTop: 12 }}>
        Showing {dressmakers.length} result{dressmakers.length === 1 ? "" : "s"}
      </p>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {dressmakers.map((d) => (
          <a
            key={d.id}
            href={`/dressmakers/${d.id}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 14,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {d.displayName ?? "Dressmaker"}
            </div>

            {d.location && <div style={{ marginTop: 6 }}>📍 {d.location}</div>}

            <div style={{ marginTop: 6 }}>
              💰{" "}
              {d.basePriceFrom != null
                ? `${formatCents(d.basePriceFrom)} ${d.currency}`
                : "Pricing not listed"}
            </div>

            {d.yearsExperience != null && (
              <div style={{ marginTop: 6 }}>
                🧵 {d.yearsExperience} yrs
              </div>
            )}

            {d.languages.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                🗣️ {d.languages.join(", ")}
              </div>
            )}

            {d.specialties.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                ✨ {d.specialties.slice(0, 4).join(" • ")}
              </div>
            )}
          </a>
        ))}
      </div>
    </main>
  )
}

function getFirst(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Simple server-rendered search form (GET).
 * This avoids client JS and keeps it beginner-friendly.
 */
function SearchBar({
  initial,
}: {
  initial: { q: string; location: string; language: string; minPrice: string }
}) {
  return (
    <form
      action="/dressmakers"
      method="GET"
      style={{
        marginTop: 16,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 140px 160px auto",
        gap: 8,
        alignItems: "end",
      }}
    >
      <label style={{ display: "grid", gap: 4 }}>
        <span>Search</span>
        <input name="q" defaultValue={initial.q} placeholder="bridal, eveningwear…" />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Location</span>
        <input name="location" defaultValue={initial.location} placeholder="Brooklyn" />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Language</span>
        <input name="language" defaultValue={initial.language} placeholder="en" />
      </label>

      <label style={{ display: "grid", gap: 4 }}>
        <span>Min price (cents)</span>
        <input name="minPrice" defaultValue={initial.minPrice} placeholder="50000" />
      </label>

      <button type="submit" style={{ padding: 10 }}>
        Search
      </button>
    </form>
  )
}
