import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token") ?? "";

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=invalid`
      );
    }

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expires < new Date()) {
      if (record) {
        await prisma.verificationToken.delete({
          where: { token },
        });
      }
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=expired`
      );
    }

    await prisma.user.update({
      where: { email: record.identifier },
      data: {
        emailVerified: new Date(),
        status: "ACTIVE",
      },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=true`
    );
  } catch (err) {
    console.error("verify-email error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?verified=error`
    );
  }
}