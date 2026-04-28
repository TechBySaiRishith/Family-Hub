import webpush from "web-push";
import type { CouponSummary } from "./types";

interface PushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export async function sendPushDigest(
  subscriptionJson: string,
  coupons: CouponSummary[],
  baseUrl: string,
  config: PushConfig,
): Promise<void> {
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const subscription = JSON.parse(subscriptionJson);

  const title =
    coupons.length === 1
      ? `Coupon expiring: ${coupons[0].sourceApp}`
      : `${coupons.length} coupons expiring soon`;

  const body =
    coupons.length === 1
      ? coupons[0].description
      : coupons
          .slice(0, 3)
          .map((c) => `${c.sourceApp}: ${c.description}`)
          .join(" · ");

  const url = coupons.length === 1 ? `${baseUrl}/coupons/${coupons[0].id}` : `${baseUrl}/coupons`;

  const payload = JSON.stringify({ title, body, url });

  await webpush.sendNotification(subscription, payload);
}
