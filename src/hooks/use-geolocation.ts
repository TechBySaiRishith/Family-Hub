"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });
  const cancelledRef = useRef(false);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: "Geolocation not supported", loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelledRef.current) return;
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        if (cancelledRef.current) return;
        setState((prev) => ({ ...prev, error: err.message, loading: false }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
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
