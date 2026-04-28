import nodemailer from "nodemailer";
import type { CouponSummary } from "./types";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export async function sendEmailDigest(
  to: string,
  userName: string,
  coupons: CouponSummary[],
  config: SmtpConfig,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  const subject =
    coupons.length === 1
      ? `Coupon expiring: ${coupons[0].description}`
      : `${coupons.length} coupons expiring soon`;

  const html = renderEmail(userName, coupons);
  const text = renderPlain(userName, coupons);

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });
}

function renderEmail(userName: string, coupons: CouponSummary[]): string {
  const rows = coupons
    .map((c) => {
      const days = daysUntil(c.expiryDate);
      const dayLabel = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e6e1d8;">
          <p style="margin: 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #b85a3a;">${escape(c.sourceApp)}</p>
          <p style="margin: 6px 0 4px; font-size: 18px; font-family: Georgia, serif; color: #2a221c;">${escape(c.description)}</p>
          <p style="margin: 0; font-size: 13px; color: #6e645a;">
            ${c.code ? `<code style="background: #f5f1ea; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${escape(c.code)}</code> · ` : ""}
            Expires ${dayLabel}
          </p>
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #f5f1ea; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #2a221c;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      <tr><td>
        <p style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #6e645a; margin: 0 0 8px;">— FamilyHub</p>
        <h1 style="font-family: Georgia, serif; font-size: 32px; line-height: 1.1; margin: 0 0 16px; color: #2a221c;">
          Hi ${escape(userName)},<br/>
          <em style="color: #b85a3a;">${coupons.length} ${coupons.length === 1 ? "coupon" : "coupons"}</em> expiring soon.
        </h1>
        <p style="font-size: 15px; color: #6e645a; line-height: 1.6;">
          A quick reminder before they slip away.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
          ${rows}
        </table>

        <p style="margin-top: 32px; font-size: 12px; color: #6e645a;">
          You're getting this because you opted into expiry reminders. You can change that in your hub settings.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function renderPlain(userName: string, coupons: CouponSummary[]): string {
  const lines = coupons.map((c) => {
    const days = daysUntil(c.expiryDate);
    const dayLabel = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    return `- ${c.sourceApp.toUpperCase()} · ${c.description} · ${c.code ? `Code: ${c.code} · ` : ""}Expires ${dayLabel}`;
  });
  return [
    `Hi ${userName},`,
    "",
    `${coupons.length} ${coupons.length === 1 ? "coupon" : "coupons"} expiring soon:`,
    "",
    ...lines,
    "",
    "— FamilyHub",
  ].join("\n");
}

function daysUntil(dateStr: string | Date): number {
  const t = typeof dateStr === "object" ? dateStr.getTime() : new Date(dateStr).getTime();
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]!));
}
