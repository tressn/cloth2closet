import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function checkSuspended(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true },
  });

  console.log("[checkSuspended]", { userId, status: user?.status, role: user?.role });

  if (user?.role === "ADMIN") return null;

  if (user?.status === "SUSPENDED") {
    return NextResponse.json(
      { error: "Your account is suspended. Contact support for help." },
      { status: 403 },
    );
  }

  return null;
}