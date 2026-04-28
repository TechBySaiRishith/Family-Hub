"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import type { MapComponentProps, MapProviderConfig, GeoResult, PlaceResult } from "./types";
import { CATEGORY_COLORS } from "./types";
import "leaflet/dist/leaflet.css";

function createCategoryIcon(category: string) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapClickHandler({ onMapClick }: { onMapClick?: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

function OsmMap({ center, zoom, markers, onMarkerClick, onMapClick, className, userLocation }: MapComponentProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className || "h-full w-full"}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSize />
      <MapClickHandler onMapClick={onMapClick} />
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.8, weight: 2 }}
        />
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={createCategoryIcon(marker.category)}
          eventHandlers={{ click: () => onMarkerClick?.(marker.id) }}
        >
          <Popup>{marker.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

async function geocode(address: string): Promise<GeoResult[]> {
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

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "json" });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": "LocationManager/1.0" },
  });
  const data = await res.json();
  return data.display_name || "";
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const results = await geocode(query);
  return results.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    name: r.displayName.split(",")[0],
    address: r.displayName,
  }));
}

export const osmProvider: MapProviderConfig = {
  name: "osm",
  label: "OpenStreetMap",
  MapComponent: OsmMap,
  geocode,
  reverseGeocode,
  searchPlaces,
};
