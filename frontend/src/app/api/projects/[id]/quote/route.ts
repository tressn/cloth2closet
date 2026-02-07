import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"
import { ProjectStatus, PaymentStatus } from "@prisma/client"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id }, include: { payment: true } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (project.dressmakerId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const amount = Number(body?.quotedTotalAmount)

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "quotedTotalAmount must be a positive number (cents)" }, { status: 400 })
  }

  const currency = typeof body?.currency === "string" ? body.currency.toUpperCase() : project.currency

  const updated = await prisma.project.update({
    where: { id },
    data: {
      quotedTotalAmount: Math.trunc(amount),
      currency,
      status: ProjectStatus.ACCEPTED, // MVP: dressmaker quote implies accepted
      payment: project.payment
        ? {
            update: {
              totalAmount: Math.trunc(amount),
              currency,
              status: PaymentStatus.REQUIRES_PAYMENT_METHOD,
            },
          }
        : {
            create: {
              totalAmount: Math.trunc(amount),
              currency,
              status: PaymentStatus.REQUIRES_PAYMENT_METHOD,
            },
          },
    },
    include: { payment: true },
  })

  return NextResponse.json({ ok: true, project: updated })
}
