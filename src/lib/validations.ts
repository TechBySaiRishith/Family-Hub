import { z } from "zod/v4";

export const categoryEnum = z.enum([
  "restaurant", "cafe", "street_food", "bakery", "bar", "dessert", "other",
]);

// Reusable: only allow http(s) — blocks javascript:, data:, vbscript: schemes
// from being saved into URL fields and rendered as <a href> later.
const httpUrl = z
  .string()
  .url()
  .refine((s) => /^https?:\/\//i.test(s), { message: "Only http(s) URLs allowed" });

export const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  category: categoryEnum.default("restaurant"),
  cuisine: z.array(z.string()).default([]),
  priceRange: z.number().int().min(1).max(4).default(2),
  sourceUrl: httpUrl.or(z.literal("")).default(""),
  sourceType: z.enum(["google_maps", "instagram", "manual"]).default("manual"),
  tagIds: z.array(z.string()).default([]),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  visited: z.boolean().optional(),
});

export const createReviewSchema = z.object({
  locationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  notes: z.string().max(1000).default(""),
  visitedAt: z.string().datetime().optional(),
});

export const parseLinkSchema = z.object({
  url: z.string().url(),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  inviteCode: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export const updateSettingsSchema = z.object({
  mapProvider: z.enum(["osm", "google", "mapbox"]).optional(),
  googleMapsApiKey: z.string().optional(),
  mapboxApiKey: z.string().optional(),
  inviteCode: z.string().min(4).optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
  vapidPublicKey: z.string().optional(),
  vapidPrivateKey: z.string().optional(),
  vapidSubject: z.string().optional(),
  twilioSid: z.string().optional(),
  twilioToken: z.string().optional(),
  twilioFrom: z.string().optional(),
});

// Coupon validations

export const sourceAppEnum = z.enum([
  "zomato", "swiggy", "paytm", "gpay", "phonepe", "amazon", "flipkart",
  "myntra", "bookmyshow", "uber", "ola", "ajio", "nykaa", "bigbasket",
  "blinkit", "zepto", "other",
]);

export const couponCategoryEnum = z.enum([
  "food", "shopping", "travel", "cashback", "entertainment", "other",
]);

// imagePath must look like our own upload paths — prevents binding a coupon
// to an arbitrary file inside the upload tree (e.g. another user's screenshot).
const couponImagePath = z
  .string()
  .regex(
    /^coupons\/[0-9A-HJKMNP-TV-Z]{26}\.(jpg|png|webp|gif)$/,
    "Invalid image path",
  );

export const createCouponSchema = z.object({
  sourceApp: sourceAppEnum.default("other"),
  sourceAppOther: z.string().max(50).default(""),
  code: z.string().max(60).nullable().optional(),
  description: z.string().min(1).max(500),
  category: couponCategoryEnum.default("other"),
  expiryDate: z.string().min(1),
  minOrderValue: z.number().nonnegative().nullable().optional(),
  maxDiscountValue: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(2000).default(""),
  url: httpUrl.or(z.literal("")).default(""),
  imagePath: couponImagePath.nullable().optional(),
  isPrivate: z.boolean().default(false),
});

export const updateCouponSchema = createCouponSchema.partial().extend({
  isUsed: z.boolean().optional(),
});

export const updateNotificationPrefsSchema = z.object({
  pushEnabled: z.boolean().optional(),
  pushSubscription: z.string().nullable().optional(),
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().email().or(z.literal("")).optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappNumber: z.string().max(20).optional(),
  daysBeforeExpiry: z.number().int().min(1).max(14).optional(),
});

// Tote validations

export const eventTypeEnum = z.enum(["wedding", "trip", "day_out", "other"]);

export const itemCategoryEnum = z.enum([
  "outfits", "documents", "toiletries", "electronics",
  "family_kit", "snacks", "medicines", "other",
]);

export const itemScopeEnum = z.enum(["shared", "user"]);

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  eventType: eventTypeEnum.default("other"),
  eventDate: z.string().min(1),  // ISO date string from <input type="date">
  destination: z.string().max(500).default(""),
  notes: z.string().max(2000).default(""),
  templateId: z.string().nullable().optional(),
});

export const updateEventSchema = createEventSchema.partial().omit({ templateId: true });

export const createChecklistItemSchema = z.object({
  eventId: z.string().min(1),
  scope: itemScopeEnum,
  text: z.string().min(1).max(200),
  quantity: z.number().int().positive().nullable().optional(),
  itemNotes: z.string().max(500).default(""),
  category: itemCategoryEnum.default("other"),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  quantity: z.number().int().positive().nullable().optional(),
  itemNotes: z.string().max(500).optional(),
  category: itemCategoryEnum.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const saveAsTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  scope: itemScopeEnum.default("shared"),  // which list to capture: shared or my private
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  eventType: eventTypeEnum.optional(),
});

export const createTemplateItemSchema = z.object({
  text: z.string().min(1).max(200),
  quantity: z.number().int().positive().nullable().optional(),
  category: itemCategoryEnum.default("other"),
});

export const updateTemplateItemSchema = z.object({
  text: z.string().min(1).max(200).optional(),
  quantity: z.number().int().positive().nullable().optional(),
  category: itemCategoryEnum.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const forkTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),  // defaults to "<original> (copy)"
});
