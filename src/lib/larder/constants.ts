// Shared Larder constants for client + server.

export const LARDER_CATEGORIES = [
  { value: "produce", label: "Produce" },
  { value: "dairy_eggs", label: "Dairy & eggs" },
  { value: "pantry", label: "Pantry" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "beverages", label: "Beverages" },
  { value: "household", label: "Household" },
  { value: "toiletries", label: "Toiletries" },
  { value: "other", label: "Other" },
] as const;

export const LARDER_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  LARDER_CATEGORIES.map((c) => [c.value, c.label]),
);

// Order matches the order shoppers typically walk a supermarket.
export const LARDER_CATEGORY_ORDER = LARDER_CATEGORIES.map((c) => c.value);
