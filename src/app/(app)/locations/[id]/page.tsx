"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DynamicMapContainer } from "@/components/map/map-container";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, Navigation, Star, Check, ExternalLink, Trash2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationDetail {
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
  sourceUrl: string;
  sourceType: string;
  addedBy: string;
  createdAt: string;
  reviews: { id: string; userId: string; rating: number; notes: string; visitedAt: string; createdAt: string }[];
  images: { id: string; filePath: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  street_food: "Street Food",
  bakery: "Bakery",
  bar: "Bar",
  dessert: "Dessert",
  other: "Place",
};

const PRICE_LABELS = ["", "₹", "₹₹", "₹₹₹", "₹₹₹₹"];

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState({ mapProvider: "osm", googleMapsApiKey: "", mapboxApiKey: "" });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  function fetchLocation() {
    fetch(`/api/locations/${id}`).then((r) => r.json()).then(setLocation);
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/locations/${id}`).then((r) => r.json()),
      fetch("/api/users/list").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings/public").then((r) => r.ok ? r.json() : { mapProvider: "osm" }),
    ]).then(([loc, usrs, setts]) => {
      setLocation(loc);
      const userMap: Record<string, string> = {};
      for (const u of usrs) userMap[u.id] = u.name;
      setUsers(userMap);
      setSettings(setts);
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this place? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/locations");
    setDeleting(false);
  }

  async function toggleVisited() {
    if (!location) return;
    await fetch(`/api/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visited: !location.visited }),
    });
    fetchLocation();
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-display text-2xl text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const avgRating = location.reviews.length > 0
    ? location.reviews.reduce((sum, r) => sum + r.rating, 0) / location.reviews.length
    : 0;

  const canEdit = session?.user.id === location.addedBy || session?.user.role === "admin";
  const apiKey = settings.mapProvider === "google" ? settings.googleMapsApiKey : settings.mapProvider === "mapbox" ? settings.mapboxApiKey : undefined;
  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="pb-12">
      <div className="w-full">
        <div className="px-6 lg:px-12 xl:px-16 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="-ml-3 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        </div>

        <section className="px-6 lg:px-12 xl:px-16 pt-8 pb-10 fade-up">
          <div className="flex items-baseline gap-3 mb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              {CATEGORY_LABELS[location.category] || location.category}
            </p>
            {location.priceRange > 0 && (
              <p className="text-[10px] tracking-[0.25em] text-muted-foreground/60">
                {PRICE_LABELS[location.priceRange]}
              </p>
            )}
            {location.visited && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-accent">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Visited
              </span>
            )}
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.9] tracking-tight text-balance mb-6">
            {location.name}
          </h1>

          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              {location.address}
            </span>
            {avgRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" strokeWidth={0} />
                <span className="font-display tabular-nums text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({location.reviews.length})</span>
              </span>
            )}
          </div>

          {location.cuisine.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground mt-3">
              {location.cuisine.map((c) => (
                <span key={c} className="after:content-['·'] after:ml-2 after:text-foreground/20 last:after:content-none">
                  {c}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="relative h-64 sm:h-80 border-y border-foreground/10">
          <DynamicMapContainer
            providerName={settings.mapProvider}
            apiKey={apiKey}
            center={{ lat: location.latitude, lng: location.longitude }}
            zoom={15}
            markers={[{
              id: location.id,
              lat: location.latitude,
              lng: location.longitude,
              name: location.name,
              category: location.category,
            }]}
          />
        </section>

        <section className="px-6 lg:px-12 xl:px-16 py-8 flex gap-3 flex-wrap">
          <Button
            render={<a href={navigateUrl} target="_blank" rel="noopener noreferrer" />}
            variant="accent"
            size="lg"
            className="flex-1 group"
          >
            <Navigation className="h-4 w-4" strokeWidth={1.5} />
            Take me there
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={toggleVisited}
            className={cn(location.visited && "border-accent text-accent")}
          >
            {location.visited ? (
              <><Check className="h-4 w-4" strokeWidth={2} /> Visited</>
            ) : (
              "Mark as visited"
            )}
          </Button>

          {location.sourceUrl && (
            <Button
              render={<a href={location.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Open source link in new tab" />}
              variant="outline"
              size="icon-lg"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              size="icon-lg"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete this place"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} aria-hidden />
              )}
            </Button>
          )}
        </section>

        {location.description && (
          <section className="px-6 lg:px-12 xl:px-16 pb-10">
            <div className="border-l-2 border-accent pl-6 py-2 max-w-2xl">
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                — Notes
              </p>
              <p className="font-display text-xl italic leading-relaxed text-balance">
                {location.description}
              </p>
            </div>
          </section>
        )}

        <section className="px-6 lg:px-12 xl:px-16 pb-10">
          <p className="text-xs text-muted-foreground/70 italic">
            Added by {users[location.addedBy] || "a keeper"} on{" "}
            {new Date(location.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </section>

        <section className="px-6 lg:px-12 xl:px-16 pb-16 border-t border-foreground/10 pt-10">
          <div className="mb-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
              — Impressions
            </p>
            <h2 className="font-display text-3xl">
              {location.reviews.length === 0 ? "No reviews yet" : `${location.reviews.length} ${location.reviews.length === 1 ? "review" : "reviews"}`}
            </h2>
          </div>

          {location.reviews.length > 0 && (
            <div className="space-y-4 mb-8">
              {location.reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  userName={users[review.userId] || "Unknown"}
                  rating={review.rating}
                  notes={review.notes}
                  visitedAt={review.visitedAt}
                  createdAt={review.createdAt}
                />
              ))}
            </div>
          )}

          <div className="border-t border-foreground/10 pt-6">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">
              — Share yours
            </p>
            <ReviewForm locationId={location.id} onSubmitted={fetchLocation} />
          </div>
        </section>
      </div>
    </div>
  );
}
