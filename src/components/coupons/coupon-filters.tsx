"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCouponStore } from "@/stores/coupon-store";
import { COUPON_CATEGORIES, SOURCE_APPS } from "@/lib/coupons";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = [
  { value: "all" as const, label: "Any time" },
  { value: "urgent" as const, label: "Within 3 days" },
  { value: "this-week" as const, label: "This week" },
  { value: "this-month" as const, label: "This month" },
];

export function CouponFilters() {
  const {
    searchQuery,
    setSearchQuery,
    sourceAppFilter,
    setSourceAppFilter,
    categoryFilter,
    setCategoryFilter,
    expiryFilter,
    setExpiryFilter,
    hideUsed,
    setHideUsed,
    resetFilters,
  } = useCouponStore();

  const hasActiveFilters =
    sourceAppFilter.length > 0 ||
    categoryFilter.length > 0 ||
    expiryFilter !== "all" ||
    !hideUsed;

  function toggleSourceApp(app: string) {
    if (sourceAppFilter.includes(app)) {
      setSourceAppFilter(sourceAppFilter.filter((a) => a !== app));
    } else {
      setSourceAppFilter([...sourceAppFilter, app]);
    }
  }

  function toggleCategory(cat: string) {
    if (categoryFilter.includes(cat)) {
      setCategoryFilter(categoryFilter.filter((c) => c !== cat));
    } else {
      setCategoryFilter([...categoryFilter, cat]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
          <Input
            placeholder="Search coupons by code, app, or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-8 h-12 border-0 border-b border-foreground/20 rounded-none bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-lg" className="relative h-12 w-12 rounded-sm shrink-0" />
            }
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] bg-background px-6 lg:px-12 xl:px-16 pt-6 pb-8 overflow-y-auto">
            <SheetHeader className="border-b border-foreground/10 pb-4 p-0">
              <SheetTitle className="flex items-center justify-between font-display text-3xl">
                Filters
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs tracking-[0.15em] uppercase text-accent hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-8 mt-6">
              <section>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Source app
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_APPS.map((app) => (
                    <button
                      key={app.value}
                      onClick={() => toggleSourceApp(app.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        sourceAppFilter.includes(app.value)
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-foreground/20 text-foreground hover:border-foreground/40"
                      )}
                    >
                      {app.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {COUPON_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        categoryFilter.includes(cat.value)
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-foreground/20 text-foreground hover:border-foreground/40"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Expiry window
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExpiryFilter(opt.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        expiryFilter === opt.value
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-foreground/20 text-foreground hover:border-foreground/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Used coupons
                </p>
                <button
                  onClick={() => setHideUsed(!hideUsed)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm border transition-all",
                    !hideUsed
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-foreground/20 text-foreground hover:border-foreground/40"
                  )}
                >
                  {hideUsed ? "Hidden" : "Showing used"}
                </button>
              </section>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
