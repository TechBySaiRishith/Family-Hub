// Built-in checklist templates for Tote.
// Seeded once on first server boot (idempotent).
//
// Add new built-ins: append to BUILT_IN_TEMPLATES, redeploy.
// Existing rows are never overwritten — to update a built-in's items
// you'd need to delete the row in `checklist_templates` and re-seed.

export type EventType = "wedding" | "trip" | "day_out" | "other";

export type ItemCategory =
  | "outfits"
  | "documents"
  | "toiletries"
  | "electronics"
  | "family_kit"
  | "snacks"
  | "medicines"
  | "other";

export interface BuiltInTemplate {
  name: string;
  eventType: EventType;
  items: Array<{
    text: string;
    quantity?: number;
    category: ItemCategory;
  }>;
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Wedding",
    eventType: "wedding",
    items: [
      { text: "Wedding outfit", category: "outfits" },
      { text: "Dance shoes", category: "outfits" },
      { text: "Change of clothes", category: "outfits" },
      { text: "Gift", category: "family_kit" },
      { text: "Marriage card", category: "family_kit" },
      { text: "Cash envelope", category: "family_kit" },
      { text: "Makeup kit", category: "toiletries" },
      { text: "Makeup remover", category: "toiletries" },
      { text: "Comb", category: "toiletries" },
      { text: "ID card", category: "documents" },
      { text: "Phone charger", category: "electronics" },
      { text: "Water bottle", category: "other" },
    ],
  },

  {
    name: "Trip — overnight",
    eventType: "trip",
    items: [
      { text: "Set of clothes", quantity: 1, category: "outfits" },
      { text: "Underwear", quantity: 2, category: "outfits" },
      { text: "Socks", quantity: 2, category: "outfits" },
      { text: "Toothbrush + paste", category: "toiletries" },
      { text: "Comb", category: "toiletries" },
      { text: "Soap / shower gel", category: "toiletries" },
      { text: "Phone charger", category: "electronics" },
      { text: "Power bank", category: "electronics" },
      { text: "Earphones", category: "electronics" },
      { text: "ID card", category: "documents" },
      { text: "Basic medicine kit", category: "medicines" },
      { text: "Water bottle", category: "snacks" },
      { text: "Light snacks", category: "snacks" },
      { text: "Cash", category: "other" },
    ],
  },

  {
    name: "Trip — multi-day",
    eventType: "trip",
    items: [
      { text: "Sets of clothes", quantity: 4, category: "outfits" },
      { text: "Underwear", quantity: 5, category: "outfits" },
      { text: "Socks", quantity: 5, category: "outfits" },
      { text: "Sleepwear", category: "outfits" },
      { text: "Slippers", category: "outfits" },
      { text: "Laundry bag", category: "outfits" },
      { text: "Toothbrush + paste", category: "toiletries" },
      { text: "Shampoo", category: "toiletries" },
      { text: "Soap / shower gel", category: "toiletries" },
      { text: "Comb", category: "toiletries" },
      { text: "Deodorant", category: "toiletries" },
      { text: "Phone charger", category: "electronics" },
      { text: "Power bank", category: "electronics" },
      { text: "Earphones", category: "electronics" },
      { text: "Camera", category: "electronics" },
      { text: "ID card", category: "documents" },
      { text: "Booking printouts / confirmations", category: "documents" },
      { text: "Basic medicine kit", category: "medicines" },
      { text: "Lock + key", category: "other" },
      { text: "Cash", category: "other" },
    ],
  },

  {
    name: "Day out",
    eventType: "day_out",
    items: [
      { text: "Water bottle", category: "snacks" },
      { text: "Light snacks", category: "snacks" },
      { text: "Sunscreen", category: "toiletries" },
      { text: "Hand sanitiser", category: "toiletries" },
      { text: "Phone", category: "electronics" },
      { text: "Power bank", category: "electronics" },
      { text: "Cash / card", category: "other" },
      { text: "Cap / hat", category: "other" },
    ],
  },

  {
    name: "Beach day",
    eventType: "day_out",
    items: [
      { text: "Swimwear", category: "outfits" },
      { text: "Change of clothes", category: "outfits" },
      { text: "Towel", category: "other" },
      { text: "Plastic bag for wet clothes", category: "other" },
      { text: "Sunscreen", category: "toiletries" },
      { text: "Hand sanitiser", category: "toiletries" },
      { text: "Sunglasses", category: "other" },
      { text: "Cap / hat", category: "other" },
      { text: "Water bottle", category: "snacks" },
      { text: "Light snacks", category: "snacks" },
      { text: "Phone", category: "electronics" },
      { text: "Cash / card", category: "other" },
    ],
  },

  {
    name: "Hill station",
    eventType: "trip",
    items: [
      { text: "Warm jacket", category: "outfits" },
      { text: "Sweater", category: "outfits" },
      { text: "Gloves", category: "outfits" },
      { text: "Cap / beanie", category: "outfits" },
      { text: "Thermal innerwear", category: "outfits" },
      { text: "Sets of clothes", quantity: 3, category: "outfits" },
      { text: "Socks (warm)", quantity: 4, category: "outfits" },
      { text: "Sturdy shoes", category: "outfits" },
      { text: "Toothbrush + paste", category: "toiletries" },
      { text: "Lip balm", category: "toiletries" },
      { text: "Moisturiser", category: "toiletries" },
      { text: "Sunscreen", category: "toiletries" },
      { text: "Phone charger", category: "electronics" },
      { text: "Power bank", category: "electronics" },
      { text: "Camera", category: "electronics" },
      { text: "ID card", category: "documents" },
      { text: "Booking printouts", category: "documents" },
      { text: "Motion sickness pills", category: "medicines" },
      { text: "Basic medicine kit", category: "medicines" },
      { text: "Water bottle", category: "snacks" },
      { text: "Light snacks", category: "snacks" },
      { text: "Cash", category: "other" },
    ],
  },
];
