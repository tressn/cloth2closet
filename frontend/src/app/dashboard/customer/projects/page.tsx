import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PaymentStatus } from "@prisma/client"

export default async function CustomerProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const projects = await prisma.project.findMany({
    where: { customerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { payment: true },
  })

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>My Projects</h1>

      <div style={{ display: "grid", gap: 10 }}>
        {projects.map((p) => (
          <div key={p.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{p.projectCode}</div>
            <div>Status: {p.status}</div>
            <div>Quote: {p.quotedTotalAmount ?? "Not yet"} {p.currency}</div>
            <div>Payment: {p.payment?.status ?? "None"}</div>
            <a href={`/dashboard/customer/projects/${p.id}`} style={{ textDecoration: "underline" }}>
              View project
            </a>


            {p.payment && p.payment.status === PaymentStatus.REQUIRES_PAYMENT_METHOD && (
              <form action={`/api/payments/checkout?projectId=${p.id}`} method="POST">
                <button type="submit" style={{ padding: 10, marginTop: 10 }}>
                  Pay now
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
