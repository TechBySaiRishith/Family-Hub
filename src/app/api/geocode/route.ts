import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { geocodeByProvider, reverseGeocodeByProvider } from "@/lib/map-providers/geocoders";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const providerSetting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "map_provider"),
  });
  const providerName = providerSetting?.value || "osm";

  let apiKey: string | undefined;
  if (providerName === "google") {
    const keySetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, "google_maps_api_key"),
    });
    apiKey = keySetting?.value;
  } else if (providerName === "mapbox") {
    const keySetting = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, "mapbox_api_key"),
    });
    apiKey = keySetting?.value;
  }

  if (address) {
    const results = await geocodeByProvider(providerName, address, apiKey);
    return NextResponse.json(results);
  }

  if (lat && lng) {
    const result = await reverseGeocodeByProvider(providerName, parseFloat(lat), parseFloat(lng), apiKey);
    return NextResponse.json({ address: result });
  }

  return NextResponse.json({ error: "Provide address or lat/lng" }, { status: 400 });
}
