import type { CouponSummary } from "./types";

interface TwilioConfig {
  sid: string;
  token: string;
  from: string; // e.g. whatsapp:+14155238886
}

export async function sendWhatsAppDigest(
  to: string,
  userName: string,
  coupons: CouponSummary[],
  config: TwilioConfig,
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sid}/Messages.json`;
  const auth = Buffer.from(`${config.sid}:${config.token}`).toString("base64");

  const body = renderBody(userName, coupons);
  const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const params = new URLSearchParams({
    From: config.from,
    To: formattedTo,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}

function renderBody(userName: string, coupons: CouponSummary[]): string {
  const header = coupons.length === 1
    ? `Hi ${userName}, a coupon is expiring soon:`
    : `Hi ${userName}, ${coupons.length} coupons are expiring soon:`;

  const lines = coupons.slice(0, 5).map((c) => {
    const days = daysUntil(c.expiryDate);
    const dayLabel = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    return `• ${c.sourceApp.toUpperCase()}: ${c.description}${c.code ? ` (${c.code})` : ""} — ${dayLabel}`;
  });

  const footer = coupons.length > 5 ? `\n… and ${coupons.length - 5} more in the hub.` : "";
  return [header, "", ...lines, footer, "", "— FamilyHub"].filter(Boolean).join("\n");
}

function daysUntil(dateStr: string | Date): number {
  const t = typeof dateStr === "object" ? dateStr.getTime() : new Date(dateStr).getTime();
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}
