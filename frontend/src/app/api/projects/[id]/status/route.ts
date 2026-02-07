import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { ProjectStatus } from "@prisma/client"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const nextStatus = body?.status as ProjectStatus

  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // MVP: allow these transitions (you can tighten later)
  const allowed = [ProjectStatus.IN_PROGRESS, ProjectStatus.READY_TO_SHIP, ProjectStatus.SHIPPED, ProjectStatus.COMPLETED, ProjectStatus.CANCELED]
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: nextStatus },
  })

  return NextResponse.json({ ok: true, project: updated })
}
