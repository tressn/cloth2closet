import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/authOptions"

export async function POST() {
  // 1. Read the current login session
  const session = await getServerSession(authOptions)

  // 2. If not logged in → block
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    )
  }

  const userId = session.user.id

  // 3. Update user role + create profile
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { role: "DRESSMAKER" },
    })

    const profile = await tx.dressmakerProfile.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        languages: [],
        currency: "USD",
      },
    })

    return { user, profile }
  })

  return NextResponse.json({ ok: true, ...result })
}
