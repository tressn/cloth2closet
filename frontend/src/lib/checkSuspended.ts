import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Returns a 403 NextResponse if the user is suspended, or null if they're fine.
 * Admins are never blocked.
 */
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

/**
 * Checks if a user is suspended. Returns true/false without producing a response.
 * Use this when you need the boolean (e.g. messaging with project exception).
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, role: true },
  });
  if (user?.role === "ADMIN") return false;
  return user?.status === "SUSPENDED";
}