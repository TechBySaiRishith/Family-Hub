import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { larderItems } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { formatLarderForWhatsApp } from "@/lib/larder/format";
import { getReminderConfig, getSetting } from "@/lib/reminders/settings";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.query.larderItems.findMany({
    where: eq(larderItems.isBought, false),
    orderBy: [asc(larderItems.category), asc(larderItems.addedAt)],
    columns: { name: true, quantity: true, itemNotes: true, category: true },
  });

  const text = formatLarderForWhatsApp(items);

  const [rawNumber, label, config] = await Promise.all([
    getSetting("larder_whatsapp_number"),
    getSetting("larder_whatsapp_label"),
    getReminderConfig(),
  ]);

  const digits = (rawNumber ?? "").replace(/\D/g, "");
  const waUrl = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  // Direct-send is only available when BOTH Twilio is configured AND a Larder
  // recipient is set. We expose the boolean so the page can show the button
  // without needing the admin-only /api/settings response.
  const directSendReady = config.whatsapp.configured && digits.length >= 8;

  // Note: rawNumber/digits are admin-set internal config and intentionally
  // not echoed back — the UI only needs the label. recipientNumber stays in
  // the URL when users open WhatsApp directly, which is the intended use.
  return NextResponse.json({
    text,
    waUrl,
    itemCount: items.length,
    recipientLabel: label || null,
    directSendReady,
  });
}
