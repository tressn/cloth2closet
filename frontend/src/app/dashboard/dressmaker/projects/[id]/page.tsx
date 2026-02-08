import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import QuoteForm from "./QuoteForm"
import ProjectDetailsEditor from "@/app/components/ProjectDetailsEditor"

export default async function DressmakerProjectDetail({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { details: true, payment: true, conversations: true },
  })
  if (!project) notFound()

  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") notFound()

  const convoId = project.conversations[0]?.id // MVP: 1 convo per project

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>{project.projectCode}</h1>
      <p>Status: {project.status}</p>

            {/*render the editor with initial details */}
      <ProjectDetailsEditor projectId={project.id} initial={project.details} />

      {/* optional: link to messages */}
      {project.conversations[0]?.id && (
        <p style={{ marginTop: 16 }}>
          <a href={`/messages/${project.conversations[0].id}`}>Open messages</a>
        </p>
      )}
{/* 
      {convoId && (
        <p>
          Conversation: <a href={`/messages/${convoId}`}>Open</a>
        </p>
      )} */}

      <h2>Quote + accept</h2>
      <QuoteForm projectId={project.id} existingAmount={project.quotedTotalAmount} currency={project.currency} />
    </main>
  )
}



export default async function DressmakerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { id } = await params

  // ✅ Load the project + details server-side
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      details: true,
      payment: true,
      conversations: true,
    },
  })

  if (!project) notFound()

  // ✅ Security: dressmaker or admin only
  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    notFound()
  }

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1>{project.projectCode}</h1>
      <p>Status: {project.status}</p>

      {/* ✅ 4B: render the editor with initial details */}
      <ProjectDetailsEditor projectId={project.id} initial={project.details} />

      {/* optional: link to messages */}
      {project.conversations[0]?.id && (
        <p style={{ marginTop: 16 }}>
          <a href={`/messages/${project.conversations[0].id}`}>Open messages</a>
        </p>
      )}
    </main>
  )
}
