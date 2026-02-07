import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"


export default async function DressmakerPublicPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
    const { id } = await params

    if (!id) notFound()
    
  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { id },
    include: {
      portfolioItems: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!dressmaker) {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>
          {dressmaker.displayName ?? "Dressmaker"}
        </h1>
        
        <a href={`/dressmakers/${dressmaker.id}/request`}>Request a quote</a>

        <div style={{ display: "grid", gap: 6 }}>
          {dressmaker.location && <div>📍 {dressmaker.location}</div>}

          {dressmaker.yearsExperience != null && (
            <div>🧵 {dressmaker.yearsExperience} years experience</div>
          )}

          <div>
            💰{" "}
            {dressmaker.basePriceFrom != null
              ? `${formatCents(dressmaker.basePriceFrom)} ${dressmaker.currency}`
              : "Pricing not listed"}
          </div>

          {dressmaker.languages?.length > 0 && (
            <div>🗣️ Languages: {dressmaker.languages.join(", ")}</div>
          )}

          {dressmaker.specialties?.length > 0 && (
            <div>✨ Specialties: {dressmaker.specialties.join(", ")}</div>
          )}

          {dressmaker.websiteUrl && (
            <div>
              🔗{" "}
              <a href={dressmaker.websiteUrl} target="_blank" rel="noreferrer">
                Website
              </a>
            </div>
          )}

          {dressmaker.instagramHandle && (
            <div>
              📸{" "}
              <a
                href={`https://instagram.com/${dressmaker.instagramHandle}`}
                target="_blank"
                rel="noreferrer"
              >
                @{dressmaker.instagramHandle}
              </a>
            </div>
          )}
        </div>

        {dressmaker.bio && (
          <section style={{ marginTop: 16 }}>
            <h2>About</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{dressmaker.bio}</p>
          </section>
        )}
      </header>

      <section>
        <h2>Portfolio</h2>

        {dressmaker.portfolioItems.length === 0 ? (
          <p>No portfolio items yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {dressmaker.portfolioItems.map((item) => (
              <article
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.title}</div>

                {item.tags?.length > 0 && (
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    {item.tags.join(" • ")}
                  </div>
                )}
                {item.imageUrls?.[0] ? (
                  <img
                    src={item.imageUrls[0]}
                    alt={item.title}
                    style={{ 
                      width: "100%", 
                      height: 140, 
                      objectFit: "cover", 
                      borderRadius: 8, 
                      marginTop: 10 
                    }}
                  />
                ) : ( 
                <div style={{ /* placeholder styles */ }}>Images coming soon</div>
)}
                {/* For now: show placeholder. Later we’ll show images. */}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function formatCents(cents: number) {
  const dollars = (cents / 100).toFixed(2)
  return `$${dollars}`
}
