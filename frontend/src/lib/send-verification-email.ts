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
  const greeting = name ? `Hi ${name},` : "Hi there,";

  await sendEmail({
    to: email,
    subject: "Verify your Cloth2Closet email",
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#E9D6E2;padding:32px 40px;text-align:center;">
                <img src="https://www.cloth2closet.com/images/cloth2closet-logo.png" alt="Cloth2Closet" width="160" style="display:block;margin:0 auto;max-width:100%;height:auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#27272a;font-size:16px;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 28px;color:#3f3f46;font-size:15px;line-height:1.6;">
                Thanks for signing up! Please verify your email address to get started on the marketplace.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${verifyUrl}" target="_blank"
                       style="display:inline-block;background-color:#86386F;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;color:#71717a;font-size:13px;line-height:1.6;">
                If the button doesn&rsquo;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;color:#3b82f6;font-size:13px;line-height:1.6;">
                <a href="${verifyUrl}" style="color:#3b82f6;text-decoration:underline;">${verifyUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0;" />

              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                This link expires in 24 hours. If you didn&rsquo;t create a Cloth2Closet account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">
                &copy; ${new Date().getFullYear()} Cloth2Closet. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    text: `${greeting}\n\nThanks for signing up! Verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— Cloth2Closet`,
  });
}