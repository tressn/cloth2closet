import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NewPortfolioItemForm from "./NewPortfolioItemForm"
import DeleteButton from "./DeleteButton"


export default async function DressmakerPortfolioPage() {
  const session = await getServerSession(authOptions)

  // Must be logged in
  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  // Must be dressmaker (or admin)
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Access denied</h1>
        <p>You must be a dressmaker to manage portfolio items.</p>
        <p>
          If you haven’t yet, go to <a href="/become-dressmaker">/become-dressmaker</a>.
        </p>
      </main>
    )
  }

  // Find this user's DressmakerProfile
  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true },
  })

  if (!profile) {
    return (
      <main style={{ padding: 24 }}>
        <h1>No dressmaker profile found</h1>
        <p>
          Go to <a href="/become-dressmaker">/become-dressmaker</a> first.
        </p>
      </main>
    )
  }

  // Load portfolio items for this dressmaker
  const items = await prisma.portfolioItem.findMany({
    where: { dressmakerId: profile.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      attireType: true,
      tags: true,
      imageUrls: true,
      description: true,
      isFeatured: true,
      createdAt: true,
    },
  })

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 18 }}>
        <h1>Portfolio</h1>
        <p>
          Manage the portfolio that appears on your public page. <br />
          Public page:{" "}
          <a href={`/dressmakers/${profile.id}`}>View your profile</a>
        </p>
      </header>

      <section style={{ marginTop: 20 }}>
        <h2>Create new item</h2>
        <NewPortfolioItemForm />
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Existing items</h2>

        {items.length === 0 ? (
          <p>No portfolio items yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                 <DeleteButton id={item.id} />
                 <a href={`/dashboard/dressmaker/portfolio/${item.id}/edit`}>Edit</a>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{item.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      Type: <b>{item.attireType}</b>
                      {item.isFeatured ? " • ⭐ Featured" : ""}
                    </div>

                    {item.tags.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        {item.tags.join(" • ")}
                      </div>
                    )}

                    {item.description && (
                      <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                        {item.description}
                      </p>
                    )}

                    <div style={{ marginTop: 10, fontSize: 12 }}>
                      Images: {item.imageUrls.length}
                    </div>
                  </div>

                  {/* Image preview placeholder now; becomes real once S3 uploads are added */}
                  <div
                    style={{
                      width: 220,
                      height: 140,
                      borderRadius: 10,
                      background: "#f3f3f3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {item.imageUrls[0] ? (
                      // This will work once imageUrls contains real URLs
                      <img
                        src={item.imageUrls[0]}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }}
                      />
                    ) : (
                      "No images yet"
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
