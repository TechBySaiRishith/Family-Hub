import { Ticket } from "lucide-react";
import type { MiniApp } from "./types";
import { CouponsDashboardWidget } from "@/components/coupons/dashboard-widget";

export const couponsMiniApp: MiniApp = {
  id: "coupons",
  label: "Coupons",
  href: "/coupons",
  icon: Ticket,
  order: 20,
  quickAdd: {
    label: "Add a coupon",
    href: "/coupons/new",
  },
  dashboardWidget: CouponsDashboardWidget,
  shareTarget: {
    // Image shares — highest priority
    priority: 10,
    match: ({ imagePath }) => Boolean(imagePath),
    buildRedirect: ({ imagePath, ocrText }) => {
      const params = new URLSearchParams({ image: imagePath || "" });
      if (ocrText) params.set("text", ocrText);
      return `/coupons/new?${params.toString()}`;
    },
  },
};

/**
 * Catch-all rule for coupons — registered separately so it runs last.
 * Anything that wasn't caught by a more specific share-target rule
 * (location URLs, etc.) falls through to coupons-from-text.
 */
export const couponsTextFallback: MiniApp["shareTarget"] = {
  priority: 9999,
  match: ({ text, title }) => Boolean((text || "").trim() || (title || "").trim()),
  buildRedirect: ({ text, title }) => {
    const combined = [title, text].filter(Boolean).join("\n").trim();
    const params = new URLSearchParams({ text: combined });
    return `/coupons/new?${params.toString()}`;
  },
};
