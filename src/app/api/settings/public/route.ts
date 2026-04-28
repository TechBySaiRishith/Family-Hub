import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSetting } from "@/lib/reminders/settings";

/**
 * Public-to-logged-in-users settings — only the values the client browser
 * needs to render maps. Map API keys are exposed to the browser anyway by
 * design (Google Maps + Mapbox keys are sent to the tile server from the
 * client), so leaking them to family members is fine.
 *
 * NEVER add SMTP / Twilio / VAPID-private secrets to this response.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [mapProvider, googleMapsApiKey, mapboxApiKey] = await Promise.all([
    getSetting("map_provider"),
    getSetting("google_maps_api_key"),
    getSetting("mapbox_api_key"),
  ]);

  return NextResponse.json({
    mapProvider: mapProvider || "osm",
    googleMapsApiKey: googleMapsApiKey || "",
    mapboxApiKey: mapboxApiKey || "",
  });
}
