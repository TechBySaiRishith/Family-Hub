import type { MapProviderConfig } from "./types";

export type { MapProviderConfig, MapComponentProps, MarkerData, LatLng, GeoResult, PlaceResult } from "./types";
export { CATEGORY_COLORS } from "./types";

let osmModule: typeof import("./osm") | null = null;
let googleModule: typeof import("./google") | null = null;
let mapboxModule: typeof import("./mapbox") | null = null;

export async function getMapProvider(name: string): Promise<MapProviderConfig> {
  switch (name) {
    case "google": {
      if (!googleModule) googleModule = await import("./google");
      return googleModule.googleProvider;
    }
    case "mapbox": {
      if (!mapboxModule) mapboxModule = await import("./mapbox");
      return mapboxModule.mapboxProvider;
    }
    case "osm":
    default: {
      if (!osmModule) osmModule = await import("./osm");
      return osmModule.osmProvider;
    }
  }
}
