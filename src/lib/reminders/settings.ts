import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function getReminderConfig() {
  const [
    smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
    vapidPublic, vapidPrivate, vapidSubject,
    twilioSid, twilioToken, twilioFrom,
    cronToken,
  ] = await Promise.all([
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
    getSetting("reminder_cron_token"),
  ]);

  return {
    smtp: {
      host: smtpHost,
      port: smtpPort ? parseInt(smtpPort) : 587,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
      configured: !!(smtpHost && smtpUser && smtpPass && smtpFrom),
    },
    push: {
      publicKey: vapidPublic,
      privateKey: vapidPrivate,
      subject: vapidSubject || "mailto:family@familyhub.local",
      configured: !!(vapidPublic && vapidPrivate),
    },
    whatsapp: {
      sid: twilioSid,
      token: twilioToken,
      from: twilioFrom,
      configured: !!(twilioSid && twilioToken && twilioFrom),
    },
    cronToken,
  };
}
