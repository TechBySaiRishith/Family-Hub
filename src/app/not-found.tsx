import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center fade-up">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full border border-foreground/15 mb-6">
          <Compass className="h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">
          — 404
        </p>
        <h1 className="font-display text-4xl sm:text-5xl mb-3">
          Off the <em className="text-accent">map.</em>
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8 text-balance">
          That page doesn&apos;t exist — or it moved while you weren&apos;t looking.
        </p>
        <Button render={<Link href="/" />} variant="accent">
          Back to the hub
        </Button>
      </div>
    </div>
  );
}
