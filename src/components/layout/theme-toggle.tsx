"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

/**
 * Three-way segmented toggle: Light / System / Dark.
 * Renders nothing until mounted to avoid SSR/CSR mismatch flicker.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 rounded-full border border-foreground/15 bg-foreground/[0.02]",
          className,
        )}
        aria-hidden
      />
    );
  }

  const current = theme ?? "system";

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full border border-foreground/15 bg-foreground/[0.02]",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${opt.label} theme`}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
