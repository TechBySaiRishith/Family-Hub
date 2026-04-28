"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Location {
  id: string;
  name: string;
  address: string;
  category: string;
  visited: boolean;
  createdAt: string;
}

export function LocationsDashboardWidget() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Location[]) => {
        setLocations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const recent = [...locations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <DashboardCard
      kicker="— Locations"
      title="Recent saves"
      seeAllHref="/locations"
      loading={loading}
    >
      {recent.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />}
          message="No places yet. Start with one."
          ctaHref="/locations/new"
          ctaLabel="Add your first place"
        />
      ) : (
        <ul className="divide-y divide-foreground/10">
          {recent.map((loc) => (
            <li key={loc.id}>
              <Link
                href={`/locations/${loc.id}`}
                className="block py-4 first:pt-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-accent">
                    {loc.category.replace(/_/g, " ")}
                  </span>
                  {loc.visited && (
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground inline-flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                      visited
                    </span>
                  )}
                </div>
                <p className="font-display text-lg leading-tight mt-1 truncate">
                  {loc.name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {loc.address}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function DashboardCard({
  kicker,
  title,
  seeAllHref,
  loading,
  children,
}: {
  kicker: string;
  title: string;
  seeAllHref: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background px-6 lg:px-10 xl:px-14 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            {kicker}
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
            {title}
          </h2>
        </div>
        <Link
          href={seeAllHref}
          className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          See all
          <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-16 bg-foreground/5 rounded-sm" />
          <div className="h-16 bg-foreground/5 rounded-sm" />
          <div className="h-16 bg-foreground/5 rounded-sm" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="border border-dashed border-foreground/15 rounded-sm p-8 text-center">
      {icon}
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button render={<Link href={ctaHref} />} variant="ghost" size="sm">
        {ctaLabel}
      </Button>
    </div>
  );
}
