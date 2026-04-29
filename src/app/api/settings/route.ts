import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { updateSettingsSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

/**
 * Mask a sensitive value for safe display: `••••1234` (last 4 chars) or
 * just `••••` if the value is too short.
 */
function mask(v: string | null): string {
  if (!v) return "";
  if (v.length <= 4) return "•".repeat(v.length);
  return "••••" + v.slice(-4);
}

// Marker that the GET handler returns for sensitive fields — the PUT handler
// treats this exact value as "leave unchanged" so a round-trip from the form
// doesn't wipe the stored secret.
const MASKED_SENTINEL_PREFIX = "••••";

const SENSITIVE_KEYS = [
  "smtp_pass",
  "twilio_token",
  "vapid_private_key",
] as const;

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    mapProvider, googleMapsApiKey, mapboxApiKey, inviteCode,
    smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
    vapidPublicKey, vapidPrivateKey, vapidSubject,
    twilioSid, twilioToken, twilioFrom,
    larderWhatsappNumber, larderWhatsappLabel,
    cronToken,
  ] = await Promise.all([
    getSetting("map_provider"),
    getSetting("google_maps_api_key"),
    getSetting("mapbox_api_key"),
    getSetting("invite_code"),
    getSetting("smtp_host"),
    getSetting("smtp_port"),
    getSetting("smtp_user"),
    getSetting("smtp_pass"),
    getSetting("smtp_from"),
    getSetting("vapid_public_key"),
    getSetting("vapid_private_key"),
    getSetting("vapid_subject"),
    getSetting("twilio_sid"),
    getSetting("twilio_token"),
    getSetting("twilio_from"),
    getSetting("larder_whatsapp_number"),
    getSetting("larder_whatsapp_label"),
    getSetting("reminder_cron_token"),
  ]);

  return NextResponse.json({
    mapProvider: mapProvider || "osm",
    googleMapsApiKey: googleMapsApiKey || "",
    mapboxApiKey: mapboxApiKey || "",
    inviteCode: inviteCode || "",

    smtpHost: smtpHost || "",
    smtpPort: smtpPort || "587",
    smtpUser: smtpUser || "",
    smtpPass: mask(smtpPass),
    smtpPassConfigured: !!smtpPass,
    smtpFrom: smtpFrom || "",

    vapidPublicKey: vapidPublicKey || "",
    vapidPrivateKey: mask(vapidPrivateKey),
    vapidPrivateKeyConfigured: !!vapidPrivateKey,
    vapidSubject: vapidSubject || "",

    twilioSid: twilioSid || "",
    twilioToken: mask(twilioToken),
    twilioTokenConfigured: !!twilioToken,
    twilioFrom: twilioFrom || "",

    larderWhatsappNumber: larderWhatsappNumber || "",
    larderWhatsappLabel: larderWhatsappLabel || "",

    cronToken: cronToken || "",
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const writes: Promise<void>[] = [];

  const map: Record<string, string | undefined> = {
    map_provider: data.mapProvider,
    google_maps_api_key: data.googleMapsApiKey,
    mapbox_api_key: data.mapboxApiKey,
    invite_code: data.inviteCode,
    smtp_host: data.smtpHost,
    smtp_port: data.smtpPort,
    smtp_user: data.smtpUser,
    smtp_pass: data.smtpPass,
    smtp_from: data.smtpFrom,
    vapid_public_key: data.vapidPublicKey,
    vapid_private_key: data.vapidPrivateKey,
    vapid_subject: data.vapidSubject,
    twilio_sid: data.twilioSid,
    twilio_token: data.twilioToken,
    twilio_from: data.twilioFrom,
    larder_whatsapp_number: data.larderWhatsappNumber,
    larder_whatsapp_label: data.larderWhatsappLabel,
  };

  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;

    // Don't overwrite a saved secret with the mask we sent on GET, and don't
    // wipe a saved secret if the user just hit Save without re-typing.
    if ((SENSITIVE_KEYS as readonly string[]).includes(k)) {
      if (v === "" || v.startsWith(MASKED_SENTINEL_PREFIX)) continue;
    }

    writes.push(setSetting(k, v));
  }

  await Promise.all(writes);
  return NextResponse.json({ success: true });
}
