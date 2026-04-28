import type { GeoResult, PlaceResult } from "./types";

// Server-safe geocoders (no Leaflet/client imports)

async function osmGeocode(address: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({ q: address, format: "json", limit: "5" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "LocationManager/1.0" },
  });
  const data = await res.json();
  return data.map((item: { lat: string; lon: string; display_name: string }) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    displayName: item.display_name,
  }));
}

async function osmReverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "json" });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": "LocationManager/1.0" },
  });
  const data = await res.json();
  return data.display_name || "";
}

async function googleGeocode(address: string, apiKey?: string): Promise<GeoResult[]> {
  if (!apiKey) return [];
  const params = new URLSearchParams({ address, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK") return [];
  return data.results.map((item: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }) => ({
    lat: item.geometry.location.lat,
    lng: item.geometry.location.lng,
    displayName: item.formatted_address,
  }));
}

async function googleReverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  return data.results?.[0]?.formatted_address || "";
}

async function mapboxGeocode(address: string, apiKey?: string): Promise<GeoResult[]> {
  if (!apiKey) return [];
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=5`
  );
  const data = await res.json();
  return (data.features || []).map((f: { center: [number, number]; place_name: string }) => ({
    lat: f.center[1],
    lng: f.center[0],
    displayName: f.place_name,
  }));
}

async function mapboxReverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${apiKey}`
  );
  const data = await res.json();
  return data.features?.[0]?.place_name || "";
}

export async function geocodeByProvider(
  providerName: string,
  address: string,
  apiKey?: string
): Promise<GeoResult[]> {
  switch (providerName) {
    case "google":
      return googleGeocode(address, apiKey);
    case "mapbox":
      return mapboxGeocode(address, apiKey);
    case "osm":
    default:
      return osmGeocode(address);
  }
}

export async function reverseGeocodeByProvider(
  providerName: string,
  lat: number,
  lng: number,
  apiKey?: string
): Promise<string> {
  switch (providerName) {
    case "google":
      return googleReverseGeocode(lat, lng, apiKey);
    case "mapbox":
      return mapboxReverseGeocode(lat, lng, apiKey);
    case "osm":
    default:
      return osmReverseGeocode(lat, lng);
  }
}

export async function searchPlacesByProvider(
  providerName: string,
  query: string,
  apiKey?: string
): Promise<PlaceResult[]> {
  const results = await geocodeByProvider(providerName, query, apiKey);
  return results.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    name: r.displayName.split(",")[0],
    address: r.displayName,
  }));
}
