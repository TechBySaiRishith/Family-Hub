import { db } from "@/lib/db";
import {
  coupons,
  notificationPreferences,
  reminderLog,
} from "@/lib/db/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { ulid } from "ulid";
import { getReminderConfig } from "./settings";
import { sendEmailDigest } from "./email";
import { sendPushDigest } from "./push";
import { sendWhatsAppDigest } from "./whatsapp";
import type { CouponSummary } from "./types";

export interface ReminderRunResult {
  sent: { push: number; email: number; whatsapp: number };
  errors: string[];
}

type Channel = "email" | "push" | "whatsapp";

const DEDUPE_WINDOW_MS = 23 * 60 * 60 * 1000;

export async function runReminders(baseUrl: string): Promise<ReminderRunResult> {
  const result: ReminderRunResult = {
    sent: { push: 0, email: 0, whatsapp: 0 },
    errors: [],
  };

  const config = await getReminderConfig();

  // Window: anything not yet expired and within the next 14 days. We narrow per-user later.
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const eligibleCoupons = await db.query.coupons.findMany({
    where: and(
      eq(coupons.isUsed, false),
      gte(coupons.expiryDate, now),
      lte(coupons.expiryDate, horizon),
    ),
  });

  if (eligibleCoupons.length === 0) return result;

  const allPrefs = await db.query.notificationPreferences.findMany();
  if (allPrefs.length === 0) return result;

  const allUsers = await db.query.users.findMany();
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  for (const prefs of allPrefs) {
    const user = userMap.get(prefs.userId);
    if (!user) continue;

    const userHorizon = new Date(now.getTime() + prefs.daysBeforeExpiry * 24 * 60 * 60 * 1000);

    const visible = eligibleCoupons.filter(
      (c) => !c.isPrivate || c.createdById === prefs.userId,
    );
    const inWindow = visible.filter((c) => c.expiryDate.getTime() <= userHorizon.getTime());
    if (inWindow.length === 0) continue;

    const summary: CouponSummary[] = inWindow
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
      .map((c) => ({
        id: c.id,
        sourceApp: c.sourceApp,
        description: c.description,
        code: c.code,
        expiryDate: c.expiryDate,
      }));

    // Email
    if (prefs.emailEnabled && config.smtp.configured) {
      const filtered = await dedupeChannel(summary, prefs.userId, "email");
      if (filtered.length > 0) {
        try {
          const targetEmail = prefs.emailAddress || user.email;
          await sendEmailDigest(targetEmail, user.name, filtered, {
            host: config.smtp.host!,
            port: config.smtp.port,
            user: config.smtp.user!,
            pass: config.smtp.pass!,
            from: config.smtp.from!,
          });
          result.sent.email++;
          await logSent(filtered, prefs.userId, "email");
        } catch (e) {
          result.errors.push(`email/${prefs.userId}: ${(e as Error).message}`);
        }
      }
    }

    // Push
    if (prefs.pushEnabled && config.push.configured && prefs.pushSubscription) {
      const filtered = await dedupeChannel(summary, prefs.userId, "push");
      if (filtered.length > 0) {
        try {
          await sendPushDigest(prefs.pushSubscription, filtered, baseUrl, {
            publicKey: config.push.publicKey!,
            privateKey: config.push.privateKey!,
            subject: config.push.subject,
          });
          result.sent.push++;
          await logSent(filtered, prefs.userId, "push");
        } catch (e) {
          // Stale subscription — clear it so we don't retry forever.
          const status = (e as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await db
              .update(notificationPreferences)
              .set({ pushEnabled: false, pushSubscription: null })
              .where(eq(notificationPreferences.userId, prefs.userId));
            result.errors.push(`push/${prefs.userId}: subscription expired (${status}) — disabled`);
          } else {
            result.errors.push(`push/${prefs.userId}: ${(e as Error).message}`);
          }
        }
      }
    }

    // WhatsApp
    if (prefs.whatsappEnabled && config.whatsapp.configured && prefs.whatsappNumber) {
      const filtered = await dedupeChannel(summary, prefs.userId, "whatsapp");
      if (filtered.length > 0) {
        try {
          await sendWhatsAppDigest(prefs.whatsappNumber, user.name, filtered, {
            sid: config.whatsapp.sid!,
            token: config.whatsapp.token!,
            from: config.whatsapp.from!,
          });
          result.sent.whatsapp++;
          await logSent(filtered, prefs.userId, "whatsapp");
        } catch (e) {
          result.errors.push(`whatsapp/${prefs.userId}: ${(e as Error).message}`);
        }
      }
    }
  }

  return result;
}

/**
 * Filter `list` down to coupons we haven't already reminded `userId` about
 * via `channel` in the last DEDUPE_WINDOW_MS. One query per call instead of
 * one per coupon.
 */
async function dedupeChannel(
  list: CouponSummary[],
  userId: string,
  channel: Channel,
): Promise<CouponSummary[]> {
  if (list.length === 0) return [];

  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const ids = list.map((c) => c.id);

  const recent = await db.query.reminderLog.findMany({
    where: and(
      eq(reminderLog.userId, userId),
      eq(reminderLog.channel, channel),
      gte(reminderLog.sentAt, cutoff),
      inArray(reminderLog.couponId, ids),
    ),
    columns: { couponId: true },
  });

  const skip = new Set(recent.map((r) => r.couponId));
  return list.filter((c) => !skip.has(c.id));
}

async function logSent(
  list: CouponSummary[],
  userId: string,
  channel: Channel,
) {
  if (list.length === 0) return;
  await db.insert(reminderLog).values(
    list.map((c) => ({
      id: ulid(),
      couponId: c.id,
      userId,
      channel,
      sentAt: new Date(),
    })),
  );
}
