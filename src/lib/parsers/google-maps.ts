export interface ParsedLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  sourceType: "google_maps" | "instagram" | "manual";
}

export async function parseGoogleMapsUrl(url: string): Promise<ParsedLocation> {
  let resolvedUrl = url;

  if (url.includes("goo.gl/maps") || url.includes("maps.app.goo.gl")) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      resolvedUrl = res.url;
    } catch {
      // If redirect fails, try to parse original URL
    }
  }

  const result: ParsedLocation = { sourceType: "google_maps" };

  const atMatch = resolvedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    result.latitude = parseFloat(atMatch[1]);
    result.longitude = parseFloat(atMatch[2]);
  }

  if (!result.latitude) {
    const urlObj = new URL(resolvedUrl);
    const q = urlObj.searchParams.get("q");
    if (q) {
      const coordMatch = q.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
      if (coordMatch) {
        result.latitude = parseFloat(coordMatch[1]);
        result.longitude = parseFloat(coordMatch[2]);
      }
    }
  }

  const placeMatch = resolvedUrl.match(/\/place\/([^/]+)/);
  if (placeMatch) {
    result.name = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
  }

  if (!result.latitude) {
    const dataMatch = resolvedUrl.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) {
      result.latitude = parseFloat(dataMatch[1]);
      result.longitude = parseFloat(dataMatch[2]);
    }
  }

  return result;
}

export function isGoogleMapsUrl(url: string): boolean {
  return (
    url.includes("google.com/maps") ||
    url.includes("goo.gl/maps") ||
    url.includes("maps.app.goo.gl") ||
    url.includes("maps.google.com")
  );
}
