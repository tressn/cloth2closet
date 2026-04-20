import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = (email ?? "").toLowerCase().trim();

    const ok = NextResponse.json({
      ok: true,
      message: "If that email exists, a reset link has been sent.",
    });

    if (!normalizedEmail) return ok;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) return ok;

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login/reset-password?token=${token}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "Reset your password",
      html: `
        <p>Hi${user.name ? ` ${user.name}` : ""},</p>
        <p>Someone requested a password reset for your account. Click the link below to choose a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    });

    return ok;
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}