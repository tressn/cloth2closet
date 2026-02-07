import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DressmakerProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")
  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") redirect("/")

  const projects = await prisma.project.findMany({
    where: { dressmakerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { details: true },
  })

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>My Projects</h1>
      <div style={{ display: "grid", gap: 10 }}>
        {projects.map((p) => (
          <a key={p.id} href={`/dashboard/dressmaker/projects/${p.id}`} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{p.projectCode}</div>
            <div style={{ fontSize: 12 }}>Status: {p.status}</div>
            <div style={{ fontSize: 12 }}>Quote: {p.quotedTotalAmount ?? "—"}</div>
          </a>
        ))}
      </div>
    </main>
  )
}
