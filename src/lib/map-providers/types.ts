import { ComponentType } from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface PlaceResult {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
}

export interface MapComponentProps {
  center: LatLng;
  zoom: number;
  markers: MarkerData[];
  onMarkerClick?: (id: string) => void;
  onMapClick?: (latlng: LatLng) => void;
  className?: string;
  userLocation?: LatLng | null;
}

export interface MapProviderConfig {
  name: string;
  label: string;
  MapComponent: ComponentType<MapComponentProps>;
  geocode: (address: string, apiKey?: string) => Promise<GeoResult[]>;
  reverseGeocode: (lat: number, lng: number, apiKey?: string) => Promise<string>;
  searchPlaces: (query: string, apiKey?: string) => Promise<PlaceResult[]>;
}

export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#ef4444",
  cafe: "#f59e0b",
  street_food: "#f97316",
  bakery: "#ec4899",
  bar: "#8b5cf6",
  dessert: "#d946ef",
  other: "#6b7280",
};
