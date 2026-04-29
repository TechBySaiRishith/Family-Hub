import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { larderItems } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { formatLarderForWhatsApp } from "@/lib/larder/format";
import { getReminderConfig, getSetting } from "@/lib/reminders/settings";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getReminderConfig();
  if (!config.whatsapp.configured) {
    return NextResponse.json(
      { error: "WhatsApp (Twilio) is not configured. Set it up in /settings." },
      { status: 412 },
    );
  }

  const recipient = await getSetting("larder_whatsapp_number");
  if (!recipient || recipient.replace(/\D/g, "").length < 8) {
    return NextResponse.json(
      { error: "No Larder WhatsApp recipient set. Configure one in /settings." },
      { status: 412 },
    );
  }

  const items = await db.query.larderItems.findMany({
    where: eq(larderItems.isBought, false),
    orderBy: [asc(larderItems.category), asc(larderItems.addedAt)],
    columns: { name: true, quantity: true, itemNotes: true, category: true },
  });

  if (items.length === 0) {
    return NextResponse.json({ error: "Nothing to send — list is empty." }, { status: 400 });
  }

  const body = formatLarderForWhatsApp(items);
  const digits = recipient.replace(/\D/g, "");
  const formattedTo = `whatsapp:+${digits}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.whatsapp.sid}/Messages.json`;
  const basic = Buffer.from(`${config.whatsapp.sid}:${config.whatsapp.token}`).toString("base64");
  const params = new URLSearchParams({
    From: config.whatsapp.from!,
    To: formattedTo,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Twilio rejected the message (${res.status}). ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, sentTo: digits, itemCount: items.length });
}
