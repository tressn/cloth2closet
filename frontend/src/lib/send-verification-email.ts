import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

/**
 * Creates a verification token and sends the confirmation email.
 * Call this after creating the user in the register route.
 */
export async function sendVerificationEmail(email: string, name?: string) {
  const token = randomBytes(32).toString("hex");

  // Upsert: if a token already exists for this email, replace it
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your email address",
    html: `
      <p>Hi${name ? ` ${name}` : ""},</p>
      <p>Thanks for signing up! Please confirm your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}