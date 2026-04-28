"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DynamicMapContainer } from "@/components/map/map-container";
import { LocationList } from "@/components/locations/location-list";
import { LocationFilters } from "@/components/locations/location-filters";
import { useAppStore } from "@/stores/app-store";
import { useGeolocation } from "@/hooks/use-geolocation";
import { haversineDistance } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Plus, Map as MapIcon, List, Loader2, MapPin } from "lucide-react";
import type { MarkerData } from "@/lib/map-providers/types";

interface Location {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  addedBy: string;
  sourceUrl: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
}

export default function LocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const geo = useGeolocation();
  const { viewMode, setViewMode, searchQuery, selectedCategories, visitedFilter, addedByFilter } = useAppStore();

  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [settings, setSettings] = useState<{ mapProvider: string; googleMapsApiKey: string; mapboxApiKey: string }>({
    mapProvider: "osm",
    googleMapsApiKey: "",
    mapboxApiKey: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/settings/public").then((r) => r.ok ? r.json() : { mapProvider: "osm", googleMapsApiKey: "", mapboxApiKey: "" }),
      fetch("/api/users/list").then((r) => r.ok ? r.json() : []),
    ]).then(([locs, setts, usrs]) => {
      setLocations(locs);
      setSettings(setts);
      setUsers(usrs);
      setLoading(false);
    });
  }, [status]);

  const filtered = useMemo(() => {
    let result = locations;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.cuisine.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((l) => selectedCategories.includes(l.category));
    }

    if (visitedFilter === "visited") {
      result = result.filter((l) => l.visited);
    } else if (visitedFilter === "unvisited") {
      result = result.filter((l) => !l.visited);
    }

    if (addedByFilter) {
      result = result.filter((l) => l.addedBy === addedByFilter);
    }

    return result;
  }, [locations, searchQuery, selectedCategories, visitedFilter, addedByFilter]);

  const withDistance = useMemo(() => {
    if (geo.latitude === null || geo.longitude === null) {
      return filtered.map((l) => ({ ...l, distance: undefined, addedByName: users.find((u) => u.id === l.addedBy)?.name }));
    }

    return filtered
      .map((l) => ({
        ...l,
        distance: haversineDistance(geo.latitude!, geo.longitude!, l.latitude, l.longitude),
        addedByName: users.find((u) => u.id === l.addedBy)?.name,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [filtered, geo.latitude, geo.longitude, users]);

  const markers: MarkerData[] = useMemo(
    () => filtered.map((l) => ({ id: l.id, lat: l.latitude, lng: l.longitude, name: l.name, category: l.category })),
    [filtered]
  );

  const apiKey = settings.mapProvider === "google" ? settings.googleMapsApiKey : settings.mapProvider === "mapbox" ? settings.mapboxApiKey : undefined;

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return null;

  const visitedCount = locations.filter((l) => l.visited).length;
  const unvisitedCount = locations.length - visitedCount;

  return (
    <div className="pb-12">
      <section className="px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="mb-10 fade-up">
          <div className="flex items-center justify-between gap-4 mb-5">
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">
              — Locations
            </p>
            <Button
              render={<Link href="/locations/new" />}
              variant="accent"
              size="sm"
              className="hidden sm:flex group"
            >
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
              Add a place
            </Button>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-[5.5rem] leading-[0.9] tracking-tight text-balance">
            {locations.length === 0 ? (
              <>
                A quiet <em className="text-accent">beginning.</em>
              </>
            ) : (
              <>
                {locations.length} {locations.length === 1 ? "place" : "places"},{" "}
                <em className="text-accent">gathered</em> so far.
              </>
            )}
          </h1>
          {locations.length > 0 && (
            <div className="mt-5 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {visitedCount} visited
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                {unvisitedCount} to try
              </span>
            </div>
          )}
        </div>

        <LocationFilters users={users} />
      </section>

      <section className="px-6 lg:px-12 xl:px-16">
        {locations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="hidden sm:flex items-center justify-between mb-6 pb-4 border-b border-foreground/10">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
                {geo.latitude && " · sorted by distance"}
              </p>
              <div className="flex items-center gap-1 p-1 rounded-full border border-foreground/15">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs tracking-wider uppercase transition-all ${
                    viewMode === "list"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3 w-3" />
                  List
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs tracking-wider uppercase transition-all ${
                    viewMode === "map"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MapIcon className="h-3 w-3" />
                  Map
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              <LocationList locations={withDistance} />
            ) : (
              <div className="h-[calc(100vh-320px)] min-h-[500px] rounded-sm overflow-hidden border border-foreground/10">
                <DynamicMapContainer
                  providerName={settings.mapProvider}
                  apiKey={apiKey}
                  markers={markers}
                  center={geo.latitude && geo.longitude ? { lat: geo.latitude, lng: geo.longitude } : undefined}
                  zoom={geo.latitude ? 12 : 5}
                  userLocation={geo.latitude && geo.longitude ? { lat: geo.latitude, lng: geo.longitude } : null}
                  onMarkerClick={(id) => router.push(`/locations/${id}`)}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* Mobile FAB */}
      <Link
        href="/locations/new"
        aria-label="Add a place"
        className="sm:hidden fixed right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-foreground/10 pt-16 pb-8">
      <div className="max-w-md mx-auto text-center fade-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border border-foreground/15 mb-6">
          <MapPin className="h-6 w-6 text-accent" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-3xl mb-3">
          Your atlas is <em>empty.</em>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 text-balance">
          Start with that one place you always recommend. The one with the best
          biryani, or the café where the light hits just right in the afternoon.
        </p>
        <Button
          render={<Link href="/locations/new" />}
          variant="accent"
          size="lg"
          className="group"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Add your first place
        </Button>
      </div>
    </div>
  );
}
