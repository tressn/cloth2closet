interface QuoteRequestedEmailParams {
  dressmakerName: string;
  projectTitle: string;
  projectCode: string;
  eventDate: Date | null;
  isRush: boolean;
  dashboardUrl: string;
}

export function quoteRequestedEmailTemplate({
  dressmakerName,
  projectTitle,
  projectCode,
  eventDate,
  isRush,
  dashboardUrl,
}: QuoteRequestedEmailParams): { html: string; text: string } {
  const greeting = dressmakerName ? `Hi ${dressmakerName},` : "Hi there,";
  const eventLine = eventDate
    ? `<strong>Event date:</strong> ${eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : `<strong>Event date:</strong> Not specified`;
  const rushBadge = isRush
    ? `<span style="display:inline-block;background-color:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;margin-left:8px;">RUSH</span>`
    : "";

  const html = `
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
            <td style="background-color:#18181b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                Cloth2Closet
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#27272a;font-size:16px;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
                You have a new quote request from a customer.
              </p>

              <!-- Project card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:17px;font-weight:600;color:#18181b;">
                      ${projectTitle}${rushBadge}
                    </p>
                    <p style="margin:0 0 12px;font-size:13px;color:#a1a1aa;">
                      ${projectCode}
                    </p>
                    <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">
                      ${eventLine}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${dashboardUrl}" target="_blank"
                       style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      View Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
                Log in to your dashboard to review the details and send a quote.
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0;" />

              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                You&rsquo;re receiving this because a customer submitted a project request on Cloth2Closet.
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
</html>`.trim();

  const text = [
    greeting,
    "",
    "You have a new quote request from a customer.",
    "",
    `Project: ${projectTitle}`,
    `Code: ${projectCode}`,
    eventDate ? `Event date: ${eventDate.toDateString()}` : "Event date: Not specified",
    isRush ? "⚡ RUSH ORDER" : "",
    "",
    `View the request: ${dashboardUrl}`,
    "",
    "— Cloth2Closet",
  ]
    .filter(Boolean)
    .join("\n");

  return { html, text };
}




interface QuoteApprovedEmailParams {
  customerName: string;
  projectTitle: string;
  projectCode: string;
  totalFormatted: string;
  depositFormatted: string;
  depositPercent: number;
  finalFormatted: string;
  isRevision: boolean;
  dashboardUrl: string;
}

export function quoteApprovedEmailTemplate({
  customerName,
  projectTitle,
  projectCode,
  totalFormatted,
  depositFormatted,
  depositPercent,
  finalFormatted,
  isRevision,
  dashboardUrl,
}: QuoteApprovedEmailParams): { html: string; text: string } {
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,";
  const headline = isRevision
    ? "Your invoice has been updated"
    : "Your quote is ready to review";
  const subtext = isRevision
    ? "Your dressmaker has updated the project total. Please review the revised breakdown below."
    : "Your dressmaker has reviewed your project and sent a quote. Here&rsquo;s the breakdown:";

  const html = `
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
            <td style="background-color:#18181b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                Cloth2Closet
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;color:#27272a;font-size:16px;line-height:1.6;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">
                ${subtext}
              </p>

              <!-- Quote card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:17px;font-weight:600;color:#18181b;">
                      ${projectTitle}
                    </p>
                    <p style="margin:0 0 16px;font-size:13px;color:#a1a1aa;">
                      ${projectCode}
                    </p>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;">Total</td>
                        <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:600;text-align:right;">${totalFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#71717a;">Deposit (${depositPercent}%)</td>
                        <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:600;text-align:right;">${depositFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-top:1px solid #e4e4e7;font-size:14px;color:#71717a;">Final payment</td>
                        <td style="padding:6px 0;border-top:1px solid #e4e4e7;font-size:14px;color:#18181b;font-weight:600;text-align:right;">${finalFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:4px 0 28px;">
                    <a href="${dashboardUrl}" target="_blank"
                       style="display:inline-block;background-color:#18181b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      ${isRevision ? "Review Updated Invoice" : "Review &amp; Pay Deposit"}
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0;" />

              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                You&rsquo;re receiving this because a dressmaker sent you a quote on Cloth2Closet.
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
</html>`.trim();

  const text = [
    greeting,
    "",
    headline,
    "",
    `Project: ${projectTitle} (${projectCode})`,
    `Total: ${totalFormatted}`,
    `Deposit (${depositPercent}%): ${depositFormatted}`,
    `Final payment: ${finalFormatted}`,
    "",
    `Review it here: ${dashboardUrl}`,
    "",
    "— Cloth2Closet",
  ].join("\n");

  return { html, text };
}