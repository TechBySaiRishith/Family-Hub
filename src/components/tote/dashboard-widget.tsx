"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EVENT_TYPE_LABELS,
  daysUntilEvent,
  formatEventCountdown,
} from "@/lib/tote/constants";

interface EventRow {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  destination?: string;
}

interface ItemBrief {
  id: string;
  isChecked: boolean;
}

interface EventWithProgress extends EventRow {
  total: number;
  checked: number;
}

export function ToteDashboardWidget() {
  const [events, setEvents] = useState<EventWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tote/events");
      if (!res.ok) {
        if (!cancelled) setLoading(false);
        return;
      }
      const all: EventRow[] = await res.json();

      // Future events only, soonest first, top 2
      const upcoming = all
        .filter((e) => daysUntilEvent(e.eventDate) >= 0)
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
        .slice(0, 2);

      // Pull item progress for each in parallel
      const withProgress = await Promise.all(
        upcoming.map(async (e) => {
          const r = await fetch(`/api/tote/events/${e.id}`);
          if (!r.ok) return { ...e, total: 0, checked: 0 };
          const data: { items: ItemBrief[] } = await r.json();
          return {
            ...e,
            total: data.items.length,
            checked: data.items.filter((i) => i.isChecked).length,
          };
        }),
      );

      if (!cancelled) {
        setEvents(withProgress);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-background px-6 lg:px-10 xl:px-14 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            — Tote
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
            Coming up
          </h2>
        </div>
        <Link
          href="/tote"
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
        </div>
      ) : events.length === 0 ? (
        <div className="border border-dashed border-foreground/15 rounded-sm p-8 text-center">
          <Briefcase className="h-6 w-6 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground mb-4">
            No events on the horizon.
          </p>
          <Button render={<Link href="/tote/new" />} variant="ghost" size="sm">
            Plan an event
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {events.map((e) => {
            const countdown = formatEventCountdown(e.eventDate);
            const pct = e.total === 0 ? 0 : Math.round((e.checked / e.total) * 100);
            return (
              <li key={e.id}>
                <Link
                  href={`/tote/${e.id}`}
                  className="block py-4 first:pt-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-accent">
                      {EVENT_TYPE_LABELS[e.eventType] || e.eventType}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] tracking-[0.15em] uppercase",
                        countdown.tone === "today" && "text-destructive",
                        countdown.tone === "soon" && "text-accent",
                        countdown.tone === "future" && "text-muted-foreground",
                        countdown.tone === "past" && "text-muted-foreground",
                      )}
                    >
                      {countdown.text}
                    </span>
                  </div>
                  <p className="font-display text-lg leading-tight mt-1 truncate">
                    {e.title}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground tabular-nums">
                      {e.checked}/{e.total} packed
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
