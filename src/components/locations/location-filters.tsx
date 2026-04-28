"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppStore } from "@/stores/app-store";
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

const VISITED_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "visited" as const, label: "Visited" },
  { value: "unvisited" as const, label: "To Visit" },
];

export function LocationFilters({ users = [] }: { users?: { id: string; name: string }[] }) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    visitedFilter,
    setVisitedFilter,
    addedByFilter,
    setAddedByFilter,
    resetFilters,
  } = useAppStore();

  const hasActiveFilters = selectedCategories.length > 0 || visitedFilter !== "all" || addedByFilter !== "";

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
          <Input
            placeholder="Search places, cuisines, neighborhoods…"
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
          <SheetContent side="bottom" className="h-[75vh] bg-background px-6 lg:px-12 xl:px-16 pt-6 pb-8">
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

            <div className="space-y-8 mt-6 overflow-y-auto">
              <section>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        selectedCategories.includes(cat.value)
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
                  Status
                </p>
                <div className="flex gap-2">
                  {VISITED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setVisitedFilter(opt.value)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        visitedFilter === opt.value
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-foreground/20 text-foreground hover:border-foreground/40"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {users.length > 0 && (
                <section>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                    Added by
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAddedByFilter("")}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        addedByFilter === ""
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-foreground/20 text-foreground hover:border-foreground/40"
                      )}
                    >
                      Everyone
                    </button>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setAddedByFilter(user.id)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm border transition-all",
                          addedByFilter === user.id
                            ? "bg-accent text-accent-foreground border-accent"
                            : "border-foreground/20 text-foreground hover:border-foreground/40"
                        )}
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Filtering:</span>
          {selectedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent hover:bg-accent/15"
            >
              {CATEGORIES.find((c) => c.value === cat)?.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {visitedFilter !== "all" && (
            <button
              onClick={() => setVisitedFilter("all")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-accent/10 text-accent hover:bg-accent/15"
            >
              {visitedFilter === "visited" ? "Visited" : "To Visit"}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
