import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import RequestForm from "./RequestForm"
import MessageButton from "../MessageButton"

export default async function RequestProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/api/auth/signin")

  const { id } = await params

  const dressmaker = await prisma.dressmakerProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, displayName: true, isPublished: true, isPaused: true },
  })
  if (!dressmaker) notFound()

  // optional: only allow requesting if published and not paused
  if (!dressmaker.isPublished || dressmaker.isPaused) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Not available</h1>
        <p>This dressmaker is not accepting requests right now.</p>
      </main>
    )
  }

  return (
     <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Request a quote</h1>
      <p>Send a request to {dressmaker.displayName ?? "this dressmaker"}.</p>

      <RequestForm dressmakerProfileId={dressmaker.id} />
    </main>
  )
}
