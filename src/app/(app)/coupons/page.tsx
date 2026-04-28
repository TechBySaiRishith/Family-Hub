"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CouponCard } from "@/components/coupons/coupon-card";
import { CouponFilters } from "@/components/coupons/coupon-filters";
import { useCouponStore } from "@/stores/coupon-store";
import { Plus, Loader2, Ticket, Search } from "lucide-react";
import { daysUntilDate } from "@/lib/coupons";

interface Coupon {
  id: string;
  sourceApp: string;
  sourceAppOther?: string;
  code?: string | null;
  description: string;
  category: string;
  expiryDate: string;
  minOrderValue?: number | null;
  maxDiscountValue?: number | null;
  imagePath?: string | null;
  isPrivate: boolean;
  isUsed: boolean;
  usedById?: string | null;
  createdById: string;
}

interface UserInfo {
  id: string;
  name: string;
}

export default function CouponsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    searchQuery,
    sourceAppFilter,
    categoryFilter,
    expiryFilter,
    hideUsed,
  } = useCouponStore();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/coupons").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/users/list").then((r) => (r.ok ? r.json() : [])),
    ]).then(([cps, usrs]: [Coupon[], UserInfo[]]) => {
      setCoupons(cps);
      const userMap: Record<string, string> = {};
      for (const u of usrs) userMap[u.id] = u.name;
      setUsers(userMap);
      setLoading(false);
    });
  }, [status]);

  const filtered = useMemo(() => {
    let result = coupons;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          (c.code || "").toLowerCase().includes(q) ||
          c.sourceApp.toLowerCase().includes(q) ||
          (c.sourceAppOther || "").toLowerCase().includes(q)
      );
    }

    if (sourceAppFilter.length > 0) {
      result = result.filter((c) => sourceAppFilter.includes(c.sourceApp));
    }

    if (categoryFilter.length > 0) {
      result = result.filter((c) => categoryFilter.includes(c.category));
    }

    if (expiryFilter !== "all") {
      result = result.filter((c) => {
        const days = daysUntilDate(c.expiryDate);
        if (days < 0) return false;
        if (expiryFilter === "urgent") return days <= 3;
        if (expiryFilter === "this-week") return days <= 7;
        if (expiryFilter === "this-month") return days <= 30;
        return true;
      });
    }

    if (hideUsed) {
      result = result.filter((c) => !c.isUsed);
    }

    // Sort: unused first by expiry asc, then used at end
    return [...result].sort((a, b) => {
      if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
  }, [coupons, searchQuery, sourceAppFilter, categoryFilter, expiryFilter, hideUsed]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) return null;

  const total = coupons.length;
  const expiringSoon = coupons.filter(
    (c) => !c.isUsed && daysUntilDate(c.expiryDate) <= 7 && daysUntilDate(c.expiryDate) >= 0
  ).length;
  const used = coupons.filter((c) => c.isUsed).length;

  return (
    <div className="pb-20 sm:pb-12">
      <section className="px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-8 lg:pb-10">
        <div className="mb-10 fade-up">
          <div className="flex items-center justify-between gap-4 mb-5">
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">
              — Coupons
            </p>
            <Button
              render={<Link href="/coupons/new" />}
              variant="accent"
              size="sm"
              className="hidden sm:flex group"
            >
              <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
              Add a coupon
            </Button>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-[5.5rem] leading-[0.9] tracking-tight text-balance">
            {total === 0 ? (
              <>
                Nothing <em className="text-accent">saved</em> yet.
              </>
            ) : (
              <>
                {total} {total === 1 ? "coupon" : "coupons"},{" "}
                <em className="text-accent">tracked.</em>
              </>
            )}
          </h1>
          {total > 0 && (
            <div className="mt-5 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {expiringSoon} expiring this week
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                {used} used
              </span>
            </div>
          )}
        </div>

        <CouponFilters />
      </section>

      <section className="px-6 lg:px-12 xl:px-16">
        {total === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-t border-foreground/10">
            <Search className="h-6 w-6 text-muted-foreground/40 mb-4" strokeWidth={1.5} />
            <h3 className="font-display text-2xl mb-2">Nothing matches.</h3>
            <p className="text-sm text-muted-foreground max-w-xs text-balance">
              Try loosening the filters, or search with different words.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden sm:flex items-center justify-between mb-6 pb-4 border-b border-foreground/10">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"} · sorted by expiry
              </p>
            </div>

            <div className="border-t border-foreground/10 sm:border-t-0">
              {filtered.map((coupon, i) => (
                <CouponCard
                  key={coupon.id}
                  {...coupon}
                  usedByName={coupon.usedById ? users[coupon.usedById] : undefined}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <Link
        href="/coupons/new"
        aria-label="Add a coupon"
        className="sm:hidden fixed right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/30 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-foreground/10 pt-16 pb-8">
      <div className="max-w-md mx-auto text-center fade-up">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full border border-foreground/15 mb-6">
          <Ticket className="h-6 w-6 text-accent" strokeWidth={1.5} />
        </div>
        <h2 className="font-display text-3xl mb-3">
          Your coupon shelf <em>is empty.</em>
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 text-balance">
          Add the next promo code that lands in your inbox. Paste the SMS,
          upload a screenshot — we&apos;ll do the rest. Never let a discount
          quietly expire again.
        </p>
        <Button
          render={<Link href="/coupons/new" />}
          variant="accent"
          size="lg"
          className="group"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Add your first coupon
        </Button>
      </div>
    </div>
  );
}
