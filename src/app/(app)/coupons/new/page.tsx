"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddCouponForm } from "@/components/coupons/add-coupon-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function NewCouponContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialText = searchParams.get("text") || "";
  const initialImagePath = searchParams.get("image") || "";

  return (
    <div className="pb-12">
      <div className="px-6 lg:px-12 xl:px-16 pt-8">
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

      <section className="px-6 lg:px-12 xl:px-16 pt-10 lg:pt-14 pb-10 lg:pb-14 fade-up">
        <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
          — New coupon
        </p>
        <h1 className="font-display text-5xl lg:text-7xl leading-[0.9] tracking-tight text-balance">
          One less
          <br />
          to <em className="text-accent">forget.</em>
        </h1>
      </section>

      <section className="grid lg:grid-cols-[1fr_3fr] gap-8 lg:gap-20 px-6 lg:px-12 xl:px-16 py-10 lg:py-14 border-t border-foreground/10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
            How this works
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
            Paste the coupon SMS, upload a screenshot, or fill it in manually.
            We&apos;ll remind you before it expires — across email, push and WhatsApp.
          </p>
          <div className="hidden lg:block text-xs text-muted-foreground/60 font-display italic">
            &ldquo;The good ones expire on Sunday — and Sunday is two days away.&rdquo;
          </div>
        </div>
        <div>
          <AddCouponForm initialText={initialText} initialImagePath={initialImagePath || undefined} />
        </div>
      </section>
    </div>
  );
}

export default function NewCouponPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <NewCouponContent />
    </Suspense>
  );
}
