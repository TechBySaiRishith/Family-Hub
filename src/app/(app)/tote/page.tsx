"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Loader2, MapPin } from "lucide-react";
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

export default function TotePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tote/events")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventRow[]) => {
        setEvents(data);
        setLoading(false);
      });
  }, [status]);

  const { upcoming, past } = useMemo(() => {
    const u: EventRow[] = [];
    const p: EventRow[] = [];
    for (const e of events) {
      if (daysUntilEvent(e.eventDate) >= 0) u.push(e);
      else p.push(e);
    }
    u.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    p.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
    return { upcoming: u, past: p };
  }, [events]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="pb-20 sm:pb-12">
      <section className="px-4 sm:px-6 lg:px-12 xl:px-16 pt-8 sm:pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="mb-10 fade-up">
          <div className="flex items-center justify-between gap-4 mb-5">
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">
              — Tote
            </p>
            <Button
              render={<Link href="/tote/new" />}
              variant="accent"
              size="sm"
              className="hidden sm:flex group"
            >
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" aria-hidden />
              Plan an event
            </Button>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] leading-[0.95] sm:leading-[0.9] tracking-tight text-balance">
            {events.length === 0 ? (
              <>Nothing <em className="text-accent">on the way.</em></>
            ) : upcoming.length === 0 ? (
              <>All <em className="text-accent">done.</em></>
            ) : (
              <>
                {upcoming.length} {upcoming.length === 1 ? "event" : "events"},{" "}
                <em className="text-accent">coming up.</em>
              </>
            )}
          </h1>
          {past.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {past.length} past {past.length === 1 ? "event" : "events"} kept for reference.
            </p>
          )}
        </div>

        <Link href="/tote/templates" className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-accent transition-colors inline-flex items-center gap-1">
          Manage templates →
        </Link>
      </section>

      <section className="px-4 sm:px-6 lg:px-12 xl:px-16">
        {events.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="border-t border-foreground/10">
                {upcoming.map((e, i) => (
                  <EventRowCard key={e.id} event={e} index={i} />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="mt-12 border-t border-foreground/10 pt-6">
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  — Past
                </p>
                {past.map((e, i) => (
                  <EventRowCard key={e.id} event={e} index={i} faded />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Link
        href="/tote/new"
        aria-label="Plan an event"
        className="sm:hidden fixed right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}

function EventRowCard({
  event,
  index,
  faded,
}: {
  event: EventRow;
  index: number;
  faded?: boolean;
}) {
  const countdown = formatEventCountdown(event.eventDate);
  const date = new Date(event.eventDate);
  return (
    <Link
      href={`/tote/${event.id}`}
      className={cn(
        "group block py-6 border-b border-foreground/10 hover:bg-foreground/[0.02] transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 fade-up",
        faded && "opacity-60",
      )}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="flex items-start gap-6">
        <div className="hidden sm:block pt-1 shrink-0">
          <span className="font-display italic text-xl text-muted-foreground/60 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-accent font-medium">
              {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
            </p>
            <p
              className={cn(
                "text-[10px] tracking-[0.15em] uppercase",
                countdown.tone === "today" && "text-destructive",
                countdown.tone === "soon" && "text-accent",
                countdown.tone === "future" && "text-muted-foreground",
                countdown.tone === "past" && "text-muted-foreground",
              )}
            >
              {countdown.text}
            </p>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl leading-[1.1] tracking-tight text-balance mb-2 group-hover:text-accent transition-colors">
            {event.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            {event.destination ? <> · <MapPin className="inline h-3 w-3 mr-0.5 -mt-0.5 opacity-60" />{event.destination}</> : null}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-foreground/10 pt-16 pb-8">
      <div className="max-w-md mx-auto text-center fade-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border border-foreground/15 mb-6">
          <Briefcase className="h-6 w-6 text-accent" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="font-display text-3xl mb-3">
          Plan your <em>next outing.</em>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 text-balance">
          A wedding, a weekend trip, a day out — Tote keeps the family from
          forgetting the gift, the charger, the marriage card. Pick a template
          to start with most of the items already in.
        </p>
        <Button
          render={<Link href="/tote/new" />}
          variant="accent"
          size="lg"
          className="group"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" aria-hidden />
          Plan your first event
        </Button>
      </div>
    </div>
  );
}
