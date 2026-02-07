import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")
  const userId = session.user.id

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ customerId: userId }, { dressmakerId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      project: true,
      messages: { take: 1, orderBy: { createdAt: "desc" } },
    },
  })

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>Messages</h1>

      {convos.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {convos.map((c) => (
            <a
              key={c.id}
              href={`/messages/${c.id}`}
              style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}
            >
              <div style={{ fontWeight: 700 }}>{c.project?.projectCode ?? "Conversation"}</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Last: {c.messages[0]?.text?.slice(0, 80) ?? "(no messages)"}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
