import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import MessageComposer from "./MessageComposer"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { id } = await params
  const userId = session.user.id

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: {
      project: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!convo) notFound()

  if (convo.customerId !== userId && convo.dressmakerId !== userId) notFound()

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>{convo.project?.projectCode ?? "Conversation"}</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 12 }}>
        {convo.messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {m.senderId === userId ? "You" : "Them"} •{" "}
              {new Date(m.createdAt).toLocaleString()}
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text ?? ""}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <MessageComposer conversationId={convo.id} />
      </div>
    </main>
  )
}
