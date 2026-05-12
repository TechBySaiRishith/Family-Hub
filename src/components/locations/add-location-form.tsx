"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, MapPin, Check, ArrowRight, Camera, Map as MapIconLucide, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "street_food", label: "Street Food" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

const COMMON_CUISINES = [
  "Indian", "Chinese", "Italian", "Japanese", "Mexican", "Thai",
  "Korean", "American", "Mediterranean", "French", "South Indian",
  "North Indian", "Mughlai", "Continental", "Biryani", "Pizza",
  "Burger", "Sushi", "Seafood", "Vegetarian", "Vegan",
];

interface AddLocationFormProps {
  initialUrl?: string;
  initialText?: string;
}

export function AddLocationForm({ initialUrl }: AddLocationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [linkUrl, setLinkUrl] = useState(initialUrl || "");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [category, setCategory] = useState("restaurant");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState(2);
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<"google_maps" | "instagram" | "manual">("manual");

  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<{ lat: number; lng: number; displayName: string }[]>([]);
  const [searchingGeo, setSearchingGeo] = useState(false);

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUrl) {
      handleParseLink(initialUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleParseLink(url?: string) {
    const parseUrl = url || linkUrl;
    if (!parseUrl) return;

    setParsing(true);
    try {
      const res = await fetch("/api/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parseUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.name) setName(data.name);
        if (data.latitude) setLatitude(data.latitude);
        if (data.longitude) setLongitude(data.longitude);
        if (data.address) setAddress(data.address);
        setSourceUrl(parseUrl);
        setSourceType(data.sourceType || "manual");

        // If we got coords but no address, reverse geocode
        if (data.latitude && data.longitude && !data.address) {
          const geoRes = await fetch(`/api/geocode?lat=${data.latitude}&lng=${data.longitude}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.address) setAddress(geoData.address);
          }
        }

        // Instagram fallback: if we got a name but no coords, auto-search for the place
        if (data.name && !data.latitude) {
          const searchRes = await fetch(`/api/geocode?address=${encodeURIComponent(data.name)}`);
          if (searchRes.ok) {
            const results = await searchRes.json();
            if (results.length > 0) {
              setGeocodeResults(results);
              setGeocodeQuery(data.name);
            }
          }
        }
      }
    } finally {
      setParsing(false);
    }
  }

  async function handleGeocode() {
    if (!geocodeQuery) return;
    setSearchingGeo(true);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(geocodeQuery)}`);
      if (res.ok) {
        const results = await res.json();
        setGeocodeResults(results);
      }
    } finally {
      setSearchingGeo(false);
    }
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateError("This browser doesn't support geolocation.");
      return;
    }
    setLocateError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setSourceType("manual");
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.address) setAddress(data.address);
          }
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it for this site in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Couldn't get a GPS fix. Try moving outdoors or closer to a window."
              : err.code === err.TIMEOUT
                ? "Location request timed out. Try again."
                : err.message;
        setLocateError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function selectGeoResult(result: { lat: number; lng: number; displayName: string }) {
    setLatitude(result.lat);
    setLongitude(result.lng);
    setAddress(result.displayName);
    if (!name) setName(result.displayName.split(",")[0]);
    setGeocodeResults([]);
    setGeocodeQuery("");
  }

  function toggleCuisine(cuisine: string) {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!latitude || !longitude) {
      alert("Please set a location by parsing a link or searching for an address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description, latitude, longitude, address,
          category, cuisine: selectedCuisines, priceRange, sourceUrl, sourceType,
        }),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/locations/${id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      {/* Step 1 */}
      <section className="fade-up">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-display italic text-muted-foreground/60">01</span>
          <h2 className="font-display text-2xl">Find the place</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6 max-w-lg">
          Drop a link from WhatsApp, Google Maps, or Instagram —
          we&apos;ll pull out the details. Or search by name. Or, if
          you&apos;re standing right in front of it, use your current location.
        </p>

        {/* Supported sources */}
        <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
          <span className="tracking-[0.15em] uppercase">Works with</span>
          <span className="flex items-center gap-1.5">
            <MapIconLucide className="h-3 w-3" strokeWidth={1.5} />
            Google Maps
          </span>
          <span className="text-foreground/20">·</span>
          <span className="flex items-center gap-1.5">
            <Camera className="h-3 w-3" strokeWidth={1.5} />
            Instagram
          </span>
        </div>

        {/* Link parser */}
        <div className="mb-2">
          <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
            Paste a link
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="maps.google.com/… or instagram.com/p/…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
            <Button
              type="button"
              onClick={() => handleParseLink()}
              disabled={!linkUrl || parsing}
              variant="outline"
              className="h-12 rounded-sm"
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
            Instagram links give us the place name — you may need to confirm the
            map pin below.
          </p>
        </div>

        {/* Divider */}
        <div className="editorial-divider text-[10px] tracking-[0.25em] uppercase text-muted-foreground my-6">
          or
        </div>

        {/* Search */}
        <div>
          <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
            <Search className="inline h-3 w-3 mr-1.5" />
            Search by name or address
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Karim's, Jama Masjid…"
              value={geocodeQuery}
              onChange={(e) => setGeocodeQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleGeocode())}
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
            <Button
              type="button"
              onClick={handleGeocode}
              disabled={searchingGeo}
              variant="outline"
              className="h-12 rounded-sm"
            >
              {searchingGeo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
          {geocodeResults.length > 0 && (
            <div className="mt-3 border border-foreground/10 rounded-sm overflow-hidden bg-card">
              {geocodeResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectGeoResult(r)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-foreground/5 transition-colors border-b border-foreground/5 last:border-0"
                >
                  <MapPin className="inline h-3 w-3 mr-2 text-accent" strokeWidth={1.5} />
                  {r.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="editorial-divider text-[10px] tracking-[0.25em] uppercase text-muted-foreground my-6">
          or
        </div>

        {/* Use current location */}
        <div>
          <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
            <Crosshair className="inline h-3 w-3 mr-1.5" />
            I&apos;m here right now
          </Label>
          <Button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            variant="outline"
            className="h-12 rounded-sm w-full justify-start gap-3"
          >
            {locating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding you…
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4" strokeWidth={1.75} />
                Use my current location
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
            Fastest way to capture a street-food stall, café, or restaurant you&apos;re
            standing in front of — we&apos;ll fill in the pin and address.
          </p>
          {locateError && (
            <p className="text-[12px] text-destructive mt-2">{locateError}</p>
          )}
        </div>

        {/* Location confirmed */}
        {latitude && longitude && (
          <div className="mt-6 border-l-2 border-accent pl-4 py-2">
            <p className="flex items-center gap-2 text-sm text-accent">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Location pinned
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono tabular-nums">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          </div>
        )}
      </section>

      {/* Step 2 */}
      <section>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display italic text-muted-foreground/60">02</span>
          <h2 className="font-display text-2xl">Describe it</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="The place everyone will remember"
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-lg focus-visible:border-accent focus-visible:ring-0 shadow-none font-display"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, pin code"
              className="h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent px-0 text-base focus-visible:border-accent focus-visible:ring-0 shadow-none"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Category
            </Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-all",
                    category === cat.value
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 hover:border-foreground/40"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Cuisine <span className="text-muted-foreground/60 normal-case tracking-normal">(pick any)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCuisine(c)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-all",
                    selectedCuisines.includes(c)
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-foreground/15 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Price Range
            </Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceRange(p)}
                  className={cn(
                    "flex-1 h-12 rounded-sm border transition-all font-display text-lg",
                    priceRange === p
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground/20 hover:border-foreground/40"
                  )}
                >
                  {"\u20B9".repeat(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Notes <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The story, the thing to order, the best time to go…"
              rows={4}
              className="border border-foreground/20 rounded-sm bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none resize-none"
            />
          </div>
        </div>
      </section>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={loading || !name || !latitude}
        className="w-full group"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Save to the atlas
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}
