"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AddLocationForm } from "@/components/locations/add-location-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function NewLocationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const initialText = searchParams.get("text") || searchParams.get("title") || "";

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
          — New entry
        </p>
        <h1 className="font-display text-5xl lg:text-7xl leading-[0.9] tracking-tight text-balance">
          A place worth
          <br />
          <em className="text-accent">remembering.</em>
        </h1>
      </section>

      <section className="grid lg:grid-cols-[1fr_3fr] gap-8 lg:gap-20 px-6 lg:px-12 xl:px-16 py-10 lg:py-14 border-t border-foreground/10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
            The process
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
            Drop a link, or search by name. Then add the details that matter —
            the category, the cuisine, your notes. A few minutes, a place saved for good.
          </p>
          <div className="hidden lg:block text-xs text-muted-foreground/60 font-display italic">
            &ldquo;Every place has a story. This is where you write it down.&rdquo;
          </div>
        </div>
        <div>
          <AddLocationForm initialUrl={initialUrl} initialText={initialText} />
        </div>
      </section>
    </div>
  );
}

export default function NewLocationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <NewLocationContent />
    </Suspense>
  );
}
