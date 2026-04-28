"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";

export function ReviewForm({ locationId, onSubmitted }: { locationId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, rating, notes }),
      });
      if (res.ok) {
        setRating(0);
        setNotes("");
        onSubmitted();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Your rating
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  i <= (hoverRating || rating)
                    ? "fill-accent text-accent"
                    : "text-foreground/15"
                }`}
                strokeWidth={0}
              />
            </button>
          ))}
        </div>
      </div>

      <Textarea
        placeholder="A sentence about the food, the vibe, the moment…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="border border-foreground/20 rounded-sm bg-transparent text-base focus-visible:border-accent focus-visible:ring-0 shadow-none resize-none"
      />

      <Button
        type="submit"
        variant="accent"
        disabled={rating === 0 || loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
      </Button>
    </form>
  );
}
