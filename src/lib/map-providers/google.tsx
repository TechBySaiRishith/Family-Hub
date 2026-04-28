"use client";

import { useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, type MapMouseEvent } from "@vis.gl/react-google-maps";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";

function GoogleMapInner({ center, zoom, markers, onMarkerClick, onMapClick, userLocation }: MapComponentProps) {
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) {
        onMapClick?.({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
      }
    },
    [onMapClick]
  );

  return (
    <Map
      defaultCenter={{ lat: center.lat, lng: center.lng }}
      defaultZoom={zoom}
      onClick={handleClick}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapId="location-manager"
    >
      {userLocation && (
        <AdvancedMarker position={{ lat: userLocation.lat, lng: userLocation.lng }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#3b82f6", border: "3px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
        </AdvancedMarker>
      )}
      {markers.map((marker) => (
        <AdvancedMarker
          key={marker.id}
          position={{ lat: marker.lat, lng: marker.lng }}
          onClick={() => onMarkerClick?.(marker.id)}
        >
          <Pin
            background={CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.other}
            borderColor="white"
            glyphColor="white"
          />
        </AdvancedMarker>
      ))}
    </Map>
  );
}

function GoogleMap(props: MapComponentProps) {
  const apiKey = (typeof window !== "undefined" && (window as unknown as { __GOOGLE_MAPS_KEY?: string }).__GOOGLE_MAPS_KEY) || "";

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Google Maps API key not configured. Go to Settings.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className={props.className || "h-full w-full"}>
        <GoogleMapInner {...props} />
      </div>
    </APIProvider>
  );
}

async function geocode(address: string, apiKey?: string): Promise<GeoResult[]> {
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

async function reverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const data = await res.json();
  return data.results?.[0]?.formatted_address || "";
}

async function searchPlaces(query: string, apiKey?: string): Promise<PlaceResult[]> {
  const results = await geocode(query, apiKey);
  return results.map((r) => ({ lat: r.lat, lng: r.lng, name: r.displayName.split(",")[0], address: r.displayName }));
}

export const googleProvider: MapProviderConfig = {
  name: "google",
  label: "Google Maps",
  MapComponent: GoogleMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
