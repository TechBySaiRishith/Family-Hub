import { MapPin } from "lucide-react";
import type { MiniApp } from "./types";
import { LocationsDashboardWidget } from "@/components/locations/dashboard-widget";

function isLocationUrl(s: string): boolean {
  return /maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|google\.com\/maps|instagram\.com\/p\/|instagram\.com\/reel\//.test(
    s
  );
}

function extractUrlFromText(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

export const locationsMiniApp: MiniApp = {
  id: "locations",
  label: "Locations",
  href: "/locations",
  icon: MapPin,
  order: 10,
  quickAdd: {
    label: "Add a place",
    href: "/locations/new",
  },
  dashboardWidget: LocationsDashboardWidget,
  shareTarget: {
    priority: 50,
    match: ({ url, text }) => {
      // Image shares never go to locations
      const candidate = url || extractUrlFromText(text || "") || "";
      return Boolean(candidate) && isLocationUrl(candidate);
    },
    buildRedirect: ({ url, text, title }) => {
      const candidate = url || extractUrlFromText(text || "") || "";
      const params = new URLSearchParams({ url: candidate });
      if (title) params.set("title", title);
      return `/locations/new?${params.toString()}`;
    },
  },
};
