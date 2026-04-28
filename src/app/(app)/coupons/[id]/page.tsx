"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Copy, Check, Trash2, ExternalLink, Lock,
  AlertCircle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  formatExpiryLabel,
  sourceAppLabel,
} from "@/lib/coupons";

interface CouponDetail {
  id: string;
  sourceApp: string;
  sourceAppOther?: string;
  code?: string | null;
  description: string;
  category: string;
  expiryDate: string;
  minOrderValue?: number | null;
  maxDiscountValue?: number | null;
  notes?: string;
  url?: string;
  imagePath?: string | null;
  isPrivate: boolean;
  isUsed: boolean;
  usedById?: string | null;
  usedAt?: string | null;
  createdById: string;
  createdAt: string;
}

export default function CouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [coupon, setCoupon] = useState<CouponDetail | null>(null);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  function fetchCoupon() {
    return fetch(`/api/coupons/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCoupon);
  }

  useEffect(() => {
    Promise.all([
      fetchCoupon(),
      fetch("/api/users/list").then((r) => (r.ok ? r.json() : [])),
    ]).then(([, usrs]: [unknown, { id: string; name: string }[]]) => {
      const userMap: Record<string, string> = {};
      for (const u of usrs) userMap[u.id] = u.name;
      setUsers(userMap);
      setLoading(false);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClaim() {
    setWorking(true);
    const res = await fetch(`/api/coupons/${id}/use`, { method: "PATCH" });
    if (res.status === 409) {
      const data = await res.json();
      toast.error(`Already claimed by ${users[data.usedById] || "someone"}`);
    } else if (res.ok) {
      toast.success("Marked as used");
      await fetchCoupon();
    }
    setWorking(false);
  }

  async function handleUnclaim() {
    setWorking(true);
    const res = await fetch(`/api/coupons/${id}/use`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Marked as unused");
      await fetchCoupon();
    }
    setWorking(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setWorking(true);
    const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Coupon deleted");
      router.push("/coupons");
    } else {
      setWorking(false);
    }
  }

  async function handleCopyCode() {
    if (!coupon?.code) return;
    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="font-display text-2xl text-muted-foreground">Not found.</p>
      </div>
    );
  }

  const expiry = formatExpiryLabel(coupon.expiryDate);
  const canEdit = session?.user.id === coupon.createdById || session?.user.role === "admin";
  const claimedBy = coupon.usedById ? users[coupon.usedById] || "someone" : null;

  return (
    <div className="pb-12 fade-up">
      <div className="px-6 lg:px-12 xl:px-16 pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      <section className="px-6 lg:px-12 xl:px-16 pt-8 pb-8">
        <div className="flex items-baseline gap-3 mb-4 flex-wrap">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent font-medium">
            {sourceAppLabel(coupon.sourceApp, coupon.sourceAppOther || undefined)}
          </p>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70">
            {CATEGORY_LABELS[coupon.category] || coupon.category}
          </p>
          {coupon.isPrivate && (
            <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
              <Lock className="h-2.5 w-2.5" strokeWidth={2} />
              Private
            </span>
          )}
        </div>

        <h1
          className={cn(
            "font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-balance mb-6",
            coupon.isUsed && "line-through decoration-1 decoration-muted-foreground/40 opacity-60"
          )}
        >
          {coupon.description}
        </h1>

        <div className="flex items-center gap-2 mb-2">
          {expiry.tone === "urgent" && (
            <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={2} />
          )}
          <p
            className={cn(
              "text-sm font-medium",
              expiry.tone === "expired" && "text-muted-foreground",
              expiry.tone === "urgent" && "text-destructive",
              expiry.tone === "soon" && "text-accent",
              expiry.tone === "ok" && "text-muted-foreground",
            )}
          >
            {expiry.text}
            <span className="text-muted-foreground font-normal ml-2">
              ·{" "}
              {new Date(coupon.expiryDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
      </section>

      {/* Code */}
      {coupon.code && (
        <section className="px-6 lg:px-12 xl:px-16 pb-8">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
            — The code
          </p>
          <div className="flex items-stretch gap-2 max-w-md">
            <code className="flex-1 h-14 flex items-center px-5 bg-foreground text-background border border-foreground rounded-sm font-mono text-xl tracking-[0.2em] tabular-nums">
              {coupon.code}
            </code>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={handleCopyCode}
              aria-label="Copy coupon code"
              className="h-14 w-14"
            >
              {copied ? (
                <Check className="h-5 w-5 text-accent" aria-hidden />
              ) : (
                <Copy className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              )}
            </Button>
          </div>
        </section>
      )}

      {/* Conditions */}
      {(coupon.minOrderValue || coupon.maxDiscountValue) && (
        <section className="px-6 lg:px-12 xl:px-16 pb-8">
          <div className="grid sm:grid-cols-2 gap-6 max-w-md">
            {coupon.minOrderValue !== null && coupon.minOrderValue !== undefined && coupon.minOrderValue > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Min order</p>
                <p className="font-display text-3xl tabular-nums">₹{coupon.minOrderValue}</p>
              </div>
            )}
            {coupon.maxDiscountValue !== null && coupon.maxDiscountValue !== undefined && coupon.maxDiscountValue > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Up to</p>
                <p className="font-display text-3xl tabular-nums">₹{coupon.maxDiscountValue}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Image */}
      {coupon.imagePath && (
        <section className="px-6 lg:px-12 xl:px-16 pb-8">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
            — Screenshot
          </p>
          <div className="border border-foreground/10 rounded-sm overflow-hidden max-w-md">
            <Image
              src={`/api/uploads/${coupon.imagePath}`}
              alt="Coupon screenshot"
              width={500}
              height={500}
              className="w-full h-auto"
            />
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="px-6 lg:px-12 xl:px-16 py-6 flex gap-3 flex-wrap border-t border-foreground/10">
        {!coupon.isUsed ? (
          <Button
            variant="accent"
            size="lg"
            onClick={handleClaim}
            disabled={working}
            className="flex-1 sm:flex-initial group"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <Check className="h-4 w-4" strokeWidth={2} />
                Mark as used
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-3 flex-1 sm:flex-initial">
            <div className="border-l-2 border-accent pl-4 py-2">
              <p className="text-sm font-medium">Used by {claimedBy}</p>
              <p className="text-xs text-muted-foreground">
                {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                }) : ""}
              </p>
            </div>
            {coupon.usedById === session?.user.id && (
              <Button variant="ghost" size="sm" onClick={handleUnclaim} disabled={working}>
                <RotateCcw className="h-3.5 w-3.5" />
                Unclaim
              </Button>
            )}
          </div>
        )}

        {coupon.url && (
          <Button
            render={<a href={coupon.url} target="_blank" rel="noopener noreferrer" />}
            variant="outline"
            size="lg"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Open offer
          </Button>
        )}

        {canEdit && (
          <Button
            variant="outline"
            size="icon-lg"
            onClick={handleDelete}
            disabled={working}
            aria-label="Delete this coupon"
          >
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" strokeWidth={1.5} aria-hidden />
            )}
          </Button>
        )}
      </section>

      {/* Notes */}
      {coupon.notes && (
        <section className="px-6 lg:px-12 xl:px-16 py-8">
          <div className="border-l-2 border-accent pl-6 py-2 max-w-2xl">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
              — Notes
            </p>
            <p className="font-display text-lg italic leading-relaxed text-balance whitespace-pre-wrap">
              {coupon.notes}
            </p>
          </div>
        </section>
      )}

      <section className="px-6 lg:px-12 xl:px-16 pb-10">
        <p className="text-xs text-muted-foreground/70 italic">
          Saved by {users[coupon.createdById] || "a keeper"} on{" "}
          {new Date(coupon.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </section>
    </div>
  );
}
