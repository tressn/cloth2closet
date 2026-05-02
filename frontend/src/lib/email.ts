// src/lib/email.ts
// ─── Brevo Transactional Email (replaces AWS SES) ───────────

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const FROM_NAME = "Cloth2Closet";
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS ?? "noreply@cloth2closet.com";
const DEFAULT_REPLY_TO = "support@cloth2closet.com";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailInput) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    ...(text ? { textContent: text } : {}),
    replyTo: { email: replyTo ?? DEFAULT_REPLY_TO },
  };

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${err}`);
  }

  return res.json();
}