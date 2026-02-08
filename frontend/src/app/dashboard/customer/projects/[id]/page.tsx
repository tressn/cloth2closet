import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"

export default async function CustomerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: { details: true, payment: true },
  })

  if (!project) notFound()

  // ✅ This is the check you asked about:
  if (project.customerId !== session.user.id && session.user.role !== "ADMIN") {
    // If they try to access another customer's project, pretend it doesn't exist
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>{project.projectCode}</h1>
      <div>Status: {project.status}</div>

      <p style={{ marginTop: 12 }}>
        CustomerId on project: <code>{project.customerId}</code>
        <br />
        Your user id: <code>{session.user.id}</code>
      </p>

      {/* Add project details UI here later */}
    </main>
  )
}
