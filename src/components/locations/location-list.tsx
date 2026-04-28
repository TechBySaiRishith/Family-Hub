"use client";

import { LocationCard } from "./location-card";
import { Search } from "lucide-react";

interface Location {
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
}

export function LocationList({ locations }: { locations: Location[] }) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="h-6 w-6 text-muted-foreground/40 mb-4" strokeWidth={1.5} />
        <h3 className="font-display text-2xl mb-2">Nothing matches.</h3>
        <p className="text-sm text-muted-foreground max-w-xs text-balance">
          Try loosening the filters, or search with different words.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-foreground/10">
      {locations.map((location, i) => (
        <LocationCard key={location.id} {...location} index={i} />
      ))}
    </div>
  );
}
