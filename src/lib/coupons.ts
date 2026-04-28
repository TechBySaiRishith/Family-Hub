// Shared coupon constants and helpers — used across server and client.

export const SOURCE_APPS = [
  { value: "zomato", label: "Zomato", color: "#e23744" },
  { value: "swiggy", label: "Swiggy", color: "#fc8019" },
  { value: "paytm", label: "Paytm", color: "#00baf2" },
  { value: "gpay", label: "Google Pay", color: "#4285f4" },
  { value: "phonepe", label: "PhonePe", color: "#5f259f" },
  { value: "amazon", label: "Amazon", color: "#ff9900" },
  { value: "flipkart", label: "Flipkart", color: "#2874f0" },
  { value: "myntra", label: "Myntra", color: "#ff3f6c" },
  { value: "bookmyshow", label: "BookMyShow", color: "#c4242b" },
  { value: "uber", label: "Uber", color: "#000000" },
  { value: "ola", label: "Ola", color: "#c4f000" },
  { value: "ajio", label: "Ajio", color: "#2d2d2d" },
  { value: "nykaa", label: "Nykaa", color: "#fc2779" },
  { value: "bigbasket", label: "BigBasket", color: "#84c225" },
  { value: "blinkit", label: "Blinkit", color: "#f8cb46" },
  { value: "zepto", label: "Zepto", color: "#7d3cff" },
  { value: "other", label: "Other", color: "#888888" },
] as const;

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_APPS.map((s) => [s.value, s.label])
);

export const SOURCE_COLORS: Record<string, string> = Object.fromEntries(
  SOURCE_APPS.map((s) => [s.value, s.color])
);

export const COUPON_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "shopping", label: "Shopping" },
  { value: "travel", label: "Travel" },
  { value: "cashback", label: "Cashback" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  COUPON_CATEGORIES.map((c) => [c.value, c.label])
);

export function daysUntilDate(dateStr: string | Date | number): number {
  const target = typeof dateStr === "object" ? dateStr.getTime() : new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function formatExpiryLabel(dateStr: string | Date | number): {
  text: string;
  tone: "expired" | "urgent" | "soon" | "ok";
} {
  const days = daysUntilDate(dateStr);
  if (days < 0) return { text: `Expired ${-days}d ago`, tone: "expired" };
  if (days === 0) return { text: "Expires today", tone: "urgent" };
  if (days === 1) return { text: "Expires tomorrow", tone: "urgent" };
  if (days <= 3) return { text: `${days} days left`, tone: "soon" };
  if (days <= 7) return { text: `${days} days left`, tone: "soon" };
  return { text: `${days} days left`, tone: "ok" };
}

export function sourceAppLabel(value: string, other?: string): string {
  if (value === "other" && other) return other;
  return SOURCE_LABELS[value] || value;
}
