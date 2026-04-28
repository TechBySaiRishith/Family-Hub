"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center fade-up">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full border border-foreground/15 mb-6">
          <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="font-display text-3xl mb-3">
          Something <em className="text-accent">went sideways.</em>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 text-balance">
          {error.message || "An unexpected error stopped this page from loading."}
          {error.digest && (
            <span className="block mt-2 text-xs font-mono text-muted-foreground/60">
              Reference: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="accent">
            <RotateCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
          <Button render={<Link href="/" />} variant="outline">
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
