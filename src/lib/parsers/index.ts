import { parseGoogleMapsUrl, isGoogleMapsUrl, type ParsedLocation } from "./google-maps";
import { parseInstagramUrl, isInstagramUrl } from "./instagram";

export type { ParsedLocation };

export type UrlType = "google_maps" | "instagram" | "unknown";

export function detectUrlType(url: string): UrlType {
  if (isGoogleMapsUrl(url)) return "google_maps";
  if (isInstagramUrl(url)) return "instagram";
  return "unknown";
}

export async function parseUrl(url: string): Promise<ParsedLocation> {
  const type = detectUrlType(url);
  switch (type) {
    case "google_maps":
      return parseGoogleMapsUrl(url);
    case "instagram":
      return parseInstagramUrl(url);
    default:
      return { sourceType: "manual" };
  }
}
