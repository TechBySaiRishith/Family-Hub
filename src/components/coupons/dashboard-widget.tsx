"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Ticket, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sourceAppLabel, daysUntilDate } from "@/lib/coupons";

interface Coupon {
  id: string;
  sourceApp: string;
  sourceAppOther?: string;
  description: string;
  expiryDate: string;
  isUsed: boolean;
}

export function CouponsDashboardWidget() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/coupons?expiring=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Coupon[]) => {
        setCoupons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const expiring = coupons.slice(0, 5);

  return (
    <div className="bg-background px-6 lg:px-10 xl:px-14 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            — Coupons
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
            Expiring soon
          </h2>
        </div>
        <Link
          href="/coupons"
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
      ) : expiring.length === 0 ? (
        <div className="border border-dashed border-foreground/15 rounded-sm p-8 text-center">
          <Ticket className="h-6 w-6 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground mb-4">
            No coupons expiring this week.
          </p>
          <Button render={<Link href="/coupons/new" />} variant="ghost" size="sm">
            Add your first coupon
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {expiring.map((coupon) => {
            const days = daysUntilDate(coupon.expiryDate);
            return (
              <li key={coupon.id}>
                <Link
                  href={`/coupons/${coupon.id}`}
                  className="block py-4 first:pt-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[10px] tracking-[0.2em] uppercase text-accent">
                          {sourceAppLabel(coupon.sourceApp, coupon.sourceAppOther)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] tracking-[0.15em] uppercase",
                            days <= 1
                              ? "text-destructive"
                              : days <= 3
                                ? "text-accent"
                                : "text-muted-foreground"
                          )}
                        >
                          {days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days left`}
                        </span>
                      </div>
                      <p className="font-display text-lg leading-tight mt-1 truncate">
                        {coupon.description}
                      </p>
                    </div>
                    {days <= 1 && (
                      <AlertCircle
                        className="h-4 w-4 text-destructive shrink-0 mt-1"
                        strokeWidth={1.5}
                        aria-label="Expires very soon"
                      />
                    )}
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
