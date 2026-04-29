"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LARDER_CATEGORY_LABELS } from "@/lib/larder/constants";

interface LarderItem {
  id: string;
  name: string;
  quantity: string | null;
  category: string;
  isBought: boolean;
}

export function LarderDashboardWidget() {
  const [items, setItems] = useState<LarderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/larder/items")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: LarderItem[]) => {
        if (!cancelled) {
          setItems(data);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const preview = items.slice(0, 4);
  const remaining = Math.max(0, items.length - preview.length);

  return (
    <div className="bg-background px-6 lg:px-10 xl:px-14 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">
            — Larder
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
            Need to buy
          </h2>
        </div>
        <Link
          href="/larder"
          className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-accent transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
        >
          Open
          <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-6 bg-foreground/5 rounded-sm" />
          <div className="h-6 bg-foreground/5 rounded-sm" />
          <div className="h-6 bg-foreground/5 rounded-sm" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-foreground/15 rounded-sm p-8 text-center">
          <ShoppingBasket className="h-6 w-6 mx-auto mb-3 text-muted-foreground/50" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground mb-4">
            Cupboards full. Nothing to buy.
          </p>
          <Button render={<Link href="/larder" />} variant="ghost" size="sm">
            Add an item
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-foreground/10">
          {preview.map((item) => (
            <li key={item.id} className="py-2.5 flex items-baseline gap-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-accent shrink-0">
                {(LARDER_CATEGORY_LABELS[item.category] ?? item.category).slice(0, 3)}
              </span>
              <span className="font-display text-lg leading-tight truncate flex-1">
                {item.name}
              </span>
              {item.quantity && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {item.quantity}
                </span>
              )}
            </li>
          ))}
          {remaining > 0 && (
            <li className="py-3 text-xs tracking-[0.15em] uppercase text-muted-foreground">
              + {remaining} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
