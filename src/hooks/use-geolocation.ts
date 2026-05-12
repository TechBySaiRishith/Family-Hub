"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  // Browser-reported 1-sigma horizontal accuracy in metres. ~5–20m for GPS,
  // hundreds-to-thousands of metres when the OS falls back to wifi/IP geolocation.
  accuracy: number | null;
  fetchedAt: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    fetchedAt: null,
    error: null,
    loading: true,
  });
  const cancelledRef = useRef(false);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelledRef.current) return;
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          fetchedAt: Date.now(),
          error: null,
          loading: false,
        });
      },
      (err) => {
        if (cancelledRef.current) return;
        setState((prev) => ({ ...prev, error: err.message, loading: false }));
      },
      // maximumAge: 0 — never return a stale cached position. The previous
      // 60s window made the "distance to" reading lag behind the user as
      // they moved, producing visibly wrong distances.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    // Defer the initial fetch out of the render commit to avoid the
    // react-hooks/set-state-in-effect warning while still triggering on mount.
    const handle = setTimeout(refresh, 0);
    return () => {
      cancelledRef.current = true;
      clearTimeout(handle);
    };
  }, [refresh]);

  return { ...state, refresh };
}
