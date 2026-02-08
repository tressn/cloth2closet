import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import MeasurementsForm from "./MeasurementsForm.tsx"

export default async function MeasurementsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const latest = await prisma.measurement.findFirst({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1>My Measurements</h1>
      <p>Update anytime. The latest entry is what we use for projects.</p>
      <MeasurementsForm initial={latest?.fieldsJson ?? null} />
    </main>
  )
}
