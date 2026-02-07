import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import EditPortfolioForm from "./EditPortfolioForm"

export default async function EditPortfolioItemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  if (session.user.role !== "DRESSMAKER" && session.user.role !== "ADMIN") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Access denied</h1>
      </main>
    )
  }

  const { id } = await params

  const profile = await prisma.dressmakerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) notFound()

  const item = await prisma.portfolioItem.findUnique({ where: { id } })
  if (!item || item.dressmakerId !== profile.id) notFound()

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1>Edit portfolio item</h1>
      <EditPortfolioForm item={item} />
    </main>
  )
}
