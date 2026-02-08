import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json()
  const fieldsJson = body?.fieldsJson

  if (!fieldsJson || typeof fieldsJson !== "object") {
    return NextResponse.json({ error: "fieldsJson must be an object" }, { status: 400 })
  }

  const measurement = await prisma.measurement.create({
    data: { customerId: session.user.id, fieldsJson },
  })

  return NextResponse.json({ ok: true, measurement })
}
