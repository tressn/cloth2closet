import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const { dressmakerProfileId, eventDate, fabricNotes } = body

  if (typeof dressmakerProfileId !== "string") {
    return NextResponse.json({ error: "dressmakerProfileId is required" }, { status: 400 })
  }

  const dm = await prisma.dressmakerProfile.findUnique({
    where: { id: dressmakerProfileId },
    select: { id: true, userId: true, isPublished: true, isPaused: true },
  })
  if (!dm) return NextResponse.json({ error: "Dressmaker not found" }, { status: 404 })
  if (!dm.isPublished || dm.isPaused) {
    return NextResponse.json({ error: "Dressmaker is not accepting requests" }, { status: 400 })
  }

  // create projectCode
  const projectCode = `P-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`

  // Create Project + Details
  const project = await prisma.project.create({
    data: {
      projectCode,
      status: ProjectStatus.REQUESTED,
      customerId: session.user.id,
      dressmakerId: dm.userId, // IMPORTANT: Project.dressmakerId is a User.id
      details: {
        create: {
          eventDate: eventDate ? new Date(eventDate) : null,
          fabricNotes: typeof fabricNotes === "string" ? fabricNotes : null,
          referenceImages: [],
        },
      },
    },
  })

  // Create or reuse conversation for this project
  // Conversation has projectId @unique + @@unique([customerId,dressmakerId,projectId])
  const convo = await prisma.conversation.upsert({
    where: { projectId: project.id },
    update: {},
    create: {
      projectId: project.id,
      customerId: session.user.id,
      dressmakerId: dm.userId,
      messages: {
        create: {
          senderId: session.user.id,
          text: `New request: ${project.projectCode}\n\n${typeof fabricNotes === "string" ? fabricNotes : ""}`.trim(),
          attachments: [],
        },
      },
    },
  })

  return NextResponse.json({ ok: true, projectId: project.id, conversationId: convo.id })
}
