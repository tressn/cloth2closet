import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, include: { details: true } })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const userId = session.user.id
  const isParty = project.customerId === userId || project.dressmakerId === userId || session.user.role === "ADMIN"
  if (!isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()

  // ensure details exists
  const details =
    project.details ??
    (await prisma.projectDetails.create({
      data: { projectId: project.id, referenceImages: [], sketchImages: [] },
    }))

  const data: any = {}

  if ("eventDate" in body) data.eventDate = body.eventDate ? new Date(body.eventDate) : null
  if ("shipByDate" in body) data.shipByDate = body.shipByDate ? new Date(body.shipByDate) : null
  if ("fabricNotes" in body) data.fabricNotes = typeof body.fabricNotes === "string" ? body.fabricNotes : null

  if ("fabricAgreed" in body) data.fabricAgreed = !!body.fabricAgreed
  if ("fabricAgreedNote" in body) data.fabricAgreedNote = typeof body.fabricAgreedNote === "string" ? body.fabricAgreedNote : null

  if ("requireSketch" in body) data.requireSketch = !!body.requireSketch

  if ("referenceImages" in body) {
    data.referenceImages = Array.isArray(body.referenceImages)
      ? body.referenceImages.map((u: any) => String(u).trim()).filter(Boolean)
      : []
  }

  if ("sketchImages" in body) {
    data.sketchImages = Array.isArray(body.sketchImages)
      ? body.sketchImages.map((u: any) => String(u).trim()).filter(Boolean)
      : []
  }

  const updated = await prisma.projectDetails.update({
    where: { id: details.id },
    data,
  })

  return NextResponse.json({ ok: true, details: updated })
}
