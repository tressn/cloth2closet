import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const role = form.get("role");

  // Never allow admin assignment here
  if (role !== "CUSTOMER" && role !== "DRESSMAKER") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // If they pick dressmaker, ensure profile exists
  if (role === "DRESSMAKER") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "DRESSMAKER",
        dressmakerProfile: {
          upsert: {
            create: {},
            update: {},
          },
        },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: "CUSTOMER",
        customerProfile: {
          upsert: {
            create: {},
            update: {},
          },
        },
      },
    });
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
