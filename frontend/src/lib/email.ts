import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.AWS_SES_REGION ?? process.env.AWS_REGION ?? "us-east-1",
  // If running on EC2/ECS/Lambda the SDK picks up creds automatically.
  // For local dev you can set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env
});

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const command = new SendEmailCommand({
    Source: FROM_ADDRESS,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        ...(text ? { Text: { Data: text } } : {}),
      },
    },
  });

  return ses.send(command);
}