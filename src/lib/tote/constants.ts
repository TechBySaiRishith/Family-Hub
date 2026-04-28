// Shared client + server constants for Tote.

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "trip", label: "Trip" },
  { value: "day_out", label: "Day out" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.value, e.label]),
);

export const ITEM_CATEGORIES = [
  { value: "outfits", label: "Outfits" },
  { value: "documents", label: "Documents" },
  { value: "toiletries", label: "Toiletries" },
  { value: "electronics", label: "Electronics" },
  { value: "family_kit", label: "Family kit" },
  { value: "snacks", label: "Snacks" },
  { value: "medicines", label: "Medicines" },
  { value: "other", label: "Other" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ITEM_CATEGORIES.map((c) => [c.value, c.label]),
);

export const CATEGORY_ORDER = ITEM_CATEGORIES.map((c) => c.value);

export function daysUntilEvent(date: string | Date): number {
  const t = typeof date === "object" ? date.getTime() : new Date(date).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((t - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatEventCountdown(date: string | Date): {
  text: string;
  tone: "past" | "today" | "soon" | "future";
} {
  const days = daysUntilEvent(date);
  if (days < 0) return { text: `${-days}d ago`, tone: "past" };
  if (days === 0) return { text: "Today", tone: "today" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  if (days <= 7) return { text: `${days} days away`, tone: "soon" };
  return { text: `${days} days away`, tone: "future" };
}
