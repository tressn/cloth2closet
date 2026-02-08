import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { FilePurpose } from "@prisma/client"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id: projectId } = await params
  const userId = session.user.id

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { details: true },
  })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const isParty =
    project.customerId === userId || project.dressmakerId === userId || session.user.role === "ADMIN"
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const urls: string[] = Array.isArray(body?.urls)
    ? body.urls.map((u: any) => String(u).trim()).filter(Boolean)
    : []

  if (urls.length === 0) return NextResponse.json({ error: "urls required" }, { status: 400 })

  // Ensure details exists
  const details =
    project.details ??
    (await prisma.projectDetails.create({
      data: { projectId: project.id, referenceImages: [], sketchImages: [] },
    }))

  // Append URLs to ProjectDetails.referenceImages
  const next = [...(details.referenceImages ?? []), ...urls]

  const updated = await prisma.projectDetails.update({
    where: { id: details.id },
    data: { referenceImages: next },
  })

  // Create FileAsset rows for traceability
  await prisma.fileAsset.createMany({
    data: urls.map((url) => ({
      url,
      purpose: FilePurpose.PROJECT_REFERENCE,
      ownerId: userId, // person who "promoted" it (fine for MVP)
      projectId: project.id,
    })),
  })

  return NextResponse.json({ ok: true, details: updated })
}
