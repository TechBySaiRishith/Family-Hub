import { Star } from "lucide-react";

interface ReviewCardProps {
  userName: string;
  rating: number;
  notes: string;
  visitedAt?: string;
  createdAt: string;
}

export function ReviewCard({ userName, rating, notes, visitedAt, createdAt }: ReviewCardProps) {
  return (
    <div className="py-5 border-b border-foreground/10 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg">{userName}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i <= rating ? "fill-accent text-accent" : "text-foreground/15"
              }`}
              strokeWidth={0}
            />
          ))}
        </div>
      </div>
      {notes && (
        <p className="text-sm text-foreground/80 leading-relaxed italic font-display">
          &ldquo;{notes}&rdquo;
        </p>
      )}
      <p className="text-xs text-muted-foreground/60 mt-2">
        {visitedAt
          ? `Visited ${new Date(visitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
          : `Reviewed ${new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
      </p>
    </div>
  );
}
