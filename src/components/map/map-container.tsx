"use client";

import dynamic from "next/dynamic";
import { useMapProvider } from "@/hooks/use-map-provider";
import type { MapComponentProps } from "@/lib/map-providers/types";
import { Loader2 } from "lucide-react";

interface MapContainerProps extends Omit<MapComponentProps, "center" | "zoom"> {
  providerName: string;
  apiKey?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}

function MapContainerInner({
  providerName,
  apiKey,
  center = { lat: 20.5937, lng: 78.9629 },
  zoom = 5,
  ...mapProps
}: MapContainerProps) {
  const { provider, loading } = useMapProvider(providerName, apiKey);

  if (loading || !provider) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MapComp = provider.MapComponent;
  return <MapComp center={center} zoom={zoom} {...mapProps} />;
}

export const DynamicMapContainer = dynamic(
  () => Promise.resolve(MapContainerInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);
