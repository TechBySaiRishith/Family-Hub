"use client";

import Link from "next/link";
import { AlertCircle, Check, Lock, Image as ImageIcon } from "lucide-react";
import {
  CATEGORY_LABELS,
  formatExpiryLabel,
  sourceAppLabel,
} from "@/lib/coupons";
import { cn } from "@/lib/utils";

interface CouponCardProps {
  id: string;
  sourceApp: string;
  sourceAppOther?: string;
  code?: string | null;
  description: string;
  category: string;
  expiryDate: string | Date;
  minOrderValue?: number | null;
  maxDiscountValue?: number | null;
  imagePath?: string | null;
  isPrivate: boolean;
  isUsed: boolean;
  usedByName?: string;
  index?: number;
}

const TONE_CLASSES = {
  expired: "text-muted-foreground",
  urgent: "text-destructive",
  soon: "text-accent",
  ok: "text-muted-foreground",
} as const;

export function CouponCard({
  id,
  sourceApp,
  sourceAppOther,
  code,
  description,
  category,
  expiryDate,
  minOrderValue,
  maxDiscountValue,
  imagePath,
  isPrivate,
  isUsed,
  usedByName,
  index = 0,
}: CouponCardProps) {
  const expiry = formatExpiryLabel(expiryDate);

  return (
    <Link
      href={`/coupons/${id}`}
      className={cn(
        "group block py-6 border-b border-foreground/10 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 fade-up",
        isUsed && "opacity-50"
      )}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <div className="flex items-start gap-6">
        <div className="hidden sm:block pt-1 shrink-0">
          <span className="font-display italic text-xl text-muted-foreground/60 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-accent font-medium">
              {sourceAppLabel(sourceApp, sourceAppOther || undefined)}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70">
              {CATEGORY_LABELS[category] || category}
            </p>
            {isPrivate && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70">
                <Lock className="h-2.5 w-2.5" strokeWidth={2} />
                Private
              </span>
            )}
            {isUsed && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Used{usedByName ? ` · ${usedByName}` : ""}
              </span>
            )}
          </div>

          <h3
            className={cn(
              "font-display text-2xl sm:text-[1.65rem] leading-[1.1] tracking-tight text-balance mb-2 transition-colors line-clamp-2",
              !isUsed && "group-hover:text-accent",
              isUsed && "line-through decoration-1 decoration-muted-foreground/40"
            )}
          >
            {description}
          </h3>

          <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            {code && (
              <span className="font-mono text-xs px-2 py-0.5 bg-foreground/5 border border-foreground/10 rounded-sm tracking-wide">
                {code}
              </span>
            )}
            {minOrderValue !== null && minOrderValue !== undefined && minOrderValue > 0 && (
              <span className="text-xs">Min ₹{minOrderValue}</span>
            )}
            {maxDiscountValue !== null && maxDiscountValue !== undefined && maxDiscountValue > 0 && (
              <span className="text-xs">Up to ₹{maxDiscountValue}</span>
            )}
            {imagePath && (
              <span className="text-xs flex items-center gap-1 text-muted-foreground/60">
                <ImageIcon className="h-3 w-3" strokeWidth={1.5} />
                screenshot
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", TONE_CLASSES[expiry.tone])}>
            {expiry.tone === "urgent" && (
              <AlertCircle className="h-3 w-3" strokeWidth={2} />
            )}
            <span className="tabular-nums">{expiry.text}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
