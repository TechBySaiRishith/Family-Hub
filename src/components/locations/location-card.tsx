"use client";

import Link from "next/link";
import { MapPin, Star, Navigation, Check } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface LocationCardProps {
  id: string;
  name: string;
  address: string;
  category: string;
  cuisine: string[];
  priceRange: number;
  visited: boolean;
  distance?: number;
  averageRating?: number;
  addedByName?: string;
  index?: number;
}

const PRICE_LABELS = ["", "\u20B9", "\u20B9\u20B9", "\u20B9\u20B9\u20B9", "\u20B9\u20B9\u20B9\u20B9"];

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  street_food: "Street Food",
  bakery: "Bakery",
  bar: "Bar",
  dessert: "Dessert",
  other: "Place",
};

export function LocationCard({
  id,
  name,
  address,
  category,
  cuisine,
  priceRange,
  visited,
  distance,
  averageRating,
  addedByName,
  index = 0,
}: LocationCardProps) {
  return (
    <Link
      href={`/locations/${id}`}
      className="group block relative py-6 border-b border-foreground/10 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 fade-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="flex items-start gap-6">
        {/* Number */}
        <div className="hidden sm:block pt-1 shrink-0">
          <span className="font-display italic text-xl text-muted-foreground/60 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {CATEGORY_LABELS[category] || category}
            </p>
            {priceRange > 0 && (
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground/60">
                {PRICE_LABELS[priceRange]}
              </p>
            )}
            {visited && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-accent">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Visited
              </span>
            )}
          </div>

          <h3 className="font-display text-2xl sm:text-3xl leading-[1.1] tracking-tight text-balance mb-2 group-hover:text-accent transition-colors">
            {name}
          </h3>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-1 mb-3">
            <MapPin className="inline h-3 w-3 mr-1 -mt-0.5 opacity-60" />
            {address}
          </p>

          {cuisine.length > 0 && (
            <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-xs text-muted-foreground mb-3">
              {cuisine.slice(0, 4).map((c) => (
                <span key={c} className="after:content-['·'] after:ml-1.5 after:text-foreground/20 last:after:content-none">
                  {c}
                </span>
              ))}
              {cuisine.length > 4 && (
                <span className="opacity-60">+{cuisine.length - 4}</span>
              )}
            </div>
          )}

          {addedByName && (
            <p className="text-xs text-muted-foreground/60 italic">
              — added by {addedByName}
            </p>
          )}
        </div>

        {/* Meta column */}
        <div className="flex flex-col items-end gap-2 shrink-0 text-right">
          {averageRating !== undefined && averageRating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" strokeWidth={0} />
              <span className="font-display tabular-nums">{averageRating.toFixed(1)}</span>
            </div>
          )}
          {distance !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3" strokeWidth={1.5} />
              <span className="tabular-nums">{formatDistance(distance)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
