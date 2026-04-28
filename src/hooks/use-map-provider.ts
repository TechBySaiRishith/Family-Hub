"use client";

import { useState, useEffect } from "react";
import { getMapProvider, type MapProviderConfig } from "@/lib/map-providers";

export function useMapProvider(providerName: string, apiKey?: string) {
  const [state, setState] = useState<{ provider: MapProviderConfig | null; loading: boolean }>({
    provider: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    getMapProvider(providerName).then((p) => {
      if (!cancelled) setState({ provider: p, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [providerName]);

  useEffect(() => {
    if (typeof window !== "undefined" && apiKey) {
      if (providerName === "google") {
        (window as unknown as { __GOOGLE_MAPS_KEY: string }).__GOOGLE_MAPS_KEY = apiKey;
      } else if (providerName === "mapbox") {
        (window as unknown as { __MAPBOX_KEY: string }).__MAPBOX_KEY = apiKey;
      }
    }
  }, [providerName, apiKey]);

  return state;
}
