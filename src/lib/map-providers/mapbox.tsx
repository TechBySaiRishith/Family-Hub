"use client";

import { useState, useCallback } from "react";
import ReactMapGL, { Marker, NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";
import "mapbox-gl/dist/mapbox-gl.css";

function MapboxMap({ center, zoom, markers, onMarkerClick, onMapClick, className, userLocation }: MapComponentProps) {
  const accessToken = (typeof window !== "undefined" && (window as unknown as { __MAPBOX_KEY?: string }).__MAPBOX_KEY) || "";

  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom,
  });

  const handleClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    },
    [onMapClick]
  );

  if (!accessToken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-muted-foreground">Mapbox access token not configured. Go to Settings.</p>
      </div>
    );
  }

  return (
    <div className={className || "h-full w-full"}>
      <ReactMapGL
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onClick={handleClick}
        mapboxAccessToken={accessToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        {userLocation && (
          <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#3b82f6", border: "3px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }} />
          </Marker>
        )}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            onClick={(e) => { e.originalEvent.stopPropagation(); onMarkerClick?.(marker.id); }}
          >
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: CATEGORY_COLORS[marker.category] || CATEGORY_COLORS.other, border: "3px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", cursor: "pointer" }} />
          </Marker>
        ))}
      </ReactMapGL>
    </div>
  );
}

async function geocode(address: string, apiKey?: string): Promise<GeoResult[]> {
  if (!apiKey) return [];
  const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${apiKey}&limit=5`);
  const data = await res.json();
  return (data.features || []).map((f: { center: [number, number]; place_name: string }) => ({
    lat: f.center[1],
    lng: f.center[0],
    displayName: f.place_name,
  }));
}

async function reverseGeocode(lat: number, lng: number, apiKey?: string): Promise<string> {
  if (!apiKey) return "";
  const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${apiKey}`);
  const data = await res.json();
  return data.features?.[0]?.place_name || "";
}

async function searchPlaces(query: string, apiKey?: string): Promise<PlaceResult[]> {
  const results = await geocode(query, apiKey);
  return results.map((r) => ({ lat: r.lat, lng: r.lng, name: r.displayName.split(",")[0], address: r.displayName }));
}

export const mapboxProvider: MapProviderConfig = {
  name: "mapbox",
  label: "Mapbox",
  MapComponent: MapboxMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
