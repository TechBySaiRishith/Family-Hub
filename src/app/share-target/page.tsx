"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";

function ShareTargetRouter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState<"deciding" | "manual">("deciding");

  useEffect(() => {
    // Always defer to the API route which uses the mini-app registry
    const sp = new URLSearchParams();
    for (const k of ["url", "text", "title"]) {
      const v = searchParams.get(k);
      if (v) sp.set(k, v);
    }
    if (sp.toString()) {
      router.replace(`/api/share-target?${sp.toString()}`);
      return;
    }
    // Defer setState out of effect commit
    Promise.resolve().then(() => setPhase("manual"));
  }, [searchParams, router]);

  if (phase === "deciding") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-label="Loading" />
        <p className="text-sm text-muted-foreground tracking-wide">
          Sorting your share…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-2xl">Nothing to add.</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        We didn&apos;t recognise the shared content. You can still add a place or
        coupon manually.
      </p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/locations/new"
          className="px-4 py-2 min-h-11 inline-flex items-center text-sm rounded-sm border border-foreground/20 hover:border-foreground/40 transition-colors"
        >
          Add a place
        </Link>
        <Link
          href="/coupons/new"
          className="px-4 py-2 min-h-11 inline-flex items-center text-sm rounded-sm bg-accent text-accent-foreground"
        >
          Add a coupon
        </Link>
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-muted-foreground" aria-live="polite">
          Loading…
        </div>
      }
    >
      <ShareTargetRouter />
    </Suspense>
  );
}
