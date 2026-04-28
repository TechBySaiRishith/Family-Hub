import * as cheerio from "cheerio";
import type { ParsedLocation } from "./google-maps";

/**
 * Extract a venue name + address from an Instagram caption.
 * Looks for 📍Place Name patterns, "at Place Name", etc.
 */
function extractVenueFromCaption(caption: string): { name?: string; address?: string } {
  if (!caption) return {};

  // 1. Location pin emoji pattern: 📍Place Name\nStreet\nCity
  // Grab everything after 📍 until we hit another emoji section, hashtag, or parens
  const pinIdx = caption.indexOf("📍");
  if (pinIdx !== -1) {
    let afterPin = caption.slice(pinIdx + 2);
    // Stop at hashtags, contact info, parens, or other emoji sections
    afterPin = afterPin.split(/[#(]|Contact:|☎️|📞|📱/)[0];
    const lines = afterPin
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && l.length > 1 && l.length < 200);

    if (lines.length >= 2) {
      return { name: lines[0], address: lines.slice(1, 3).join(", ") };
    }
    if (lines.length === 1) {
      // Maybe comma-separated
      const parts = lines[0].split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { name: parts[0], address: parts.slice(1).join(", ") };
      }
      return { name: lines[0] };
    }
  }

  // 2. "at Place Name" pattern
  const atMatch = caption.match(/\bat\s+([A-Z][A-Za-z0-9&'\s]{2,60}?)(?=[,.!?\n]|$)/);
  if (atMatch) {
    return { name: atMatch[1].trim() };
  }

  // 3. "visited Place Name" / "loved Place Name"
  const verbMatch = caption.match(/\b(?:visited|loved|tried|ate at)\s+([A-Z][A-Za-z0-9&'\s]{2,60}?)(?=[,.!?\n]|$)/i);
  if (verbMatch) {
    return { name: verbMatch[1].trim() };
  }

  return {};
}

/**
 * Strip the "Author on Instagram:" prefix from og:title content.
 */
function cleanOgTitle(title: string): string {
  const match = title.match(/on Instagram:\s*"([\s\S]*?)"?\s*$/);
  if (match) return match[1];
  return title;
}

export async function parseInstagramUrl(url: string): Promise<ParsedLocation> {
  const result: ParsedLocation = { sourceType: "instagram" };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return result;

    const html = await res.text();
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const ogDescription = $('meta[property="og:description"]').attr("content") || "";

    // Try structured data first
    let foundFromJsonLd = false;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "");
        if (data.contentLocation) {
          result.name = data.contentLocation.name;
          if (data.contentLocation.geo) {
            result.latitude = data.contentLocation.geo.latitude;
            result.longitude = data.contentLocation.geo.longitude;
          }
          foundFromJsonLd = true;
        }
      } catch {
        // Ignore JSON parse errors
      }
    });

    // Fallback: extract venue from caption
    if (!foundFromJsonLd) {
      // Instagram puts the caption in og:title with prefix; description has count info
      const cleanedTitle = cleanOgTitle(ogTitle);
      // Try title first (has the full caption), then description
      const caption = cleanedTitle.length > 20 ? cleanedTitle : ogDescription;

      const extracted = extractVenueFromCaption(caption);
      if (extracted.name) result.name = extracted.name;
      if (extracted.address) result.address = extracted.address;
    }
  } catch {
    // Instagram may block the request
  }

  return result;
}

export function isInstagramUrl(url: string): boolean {
  return url.includes("instagram.com/p/") || url.includes("instagram.com/reel/");
}
