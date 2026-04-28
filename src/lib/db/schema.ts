import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address").notNull(),
  category: text("category", {
    enum: ["restaurant", "cafe", "street_food", "bakery", "bar", "dessert", "other"],
  }).notNull().default("restaurant"),
  cuisine: text("cuisine").default("[]"),
  priceRange: integer("price_range").default(2),
  sourceUrl: text("source_url").default(""),
  sourceType: text("source_type", {
    enum: ["google_maps", "instagram", "manual"],
  }).notNull().default("manual"),
  // restrict — admins delete a user only after their content is reassigned/removed
  addedBy: text("added_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  visited: integer("visited", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(),
  notes: text("notes").default(""),
  visitedAt: integer("visited_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
});

export const locationTags = sqliteTable("location_tags", {
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.locationId, table.tagId] }),
]);

export const locationImages = sqliteTable("location_images", {
  id: text("id").primaryKey(),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Coupon mini-app

export const coupons = sqliteTable("coupons", {
  id: text("id").primaryKey(),
  sourceApp: text("source_app").notNull(),
  sourceAppOther: text("source_app_other").default(""),
  code: text("code"),
  description: text("description").notNull(),
  category: text("category", {
    enum: ["food", "shopping", "travel", "cashback", "entertainment", "other"],
  }).notNull().default("other"),
  expiryDate: integer("expiry_date", { mode: "timestamp_ms" }).notNull(),
  minOrderValue: real("min_order_value"),
  maxDiscountValue: real("max_discount_value"),
  notes: text("notes").default(""),
  url: text("url").default(""),
  imagePath: text("image_path"),
  isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
  isUsed: integer("is_used", { mode: "boolean" }).notNull().default(false),
  // claim is dropped if the claimer is deleted
  usedById: text("used_by_id").references(() => users.id, { onDelete: "set null" }),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  // creator deletion is blocked while they have coupons (use soft-delete instead)
  createdById: text("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  pushEnabled: integer("push_enabled", { mode: "boolean" }).notNull().default(false),
  pushSubscription: text("push_subscription"),
  emailEnabled: integer("email_enabled", { mode: "boolean" }).notNull().default(false),
  emailAddress: text("email_address"),
  whatsappEnabled: integer("whatsapp_enabled", { mode: "boolean" }).notNull().default(false),
  whatsappNumber: text("whatsapp_number"),
  daysBeforeExpiry: integer("days_before_expiry").notNull().default(3),
});

export const reminderLog = sqliteTable("reminder_log", {
  id: text("id").primaryKey(),
  couponId: text("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: text("channel", { enum: ["push", "email", "whatsapp"] }).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

// Tote mini-app — pre-event packing checklists.

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  eventType: text("event_type", {
    enum: ["wedding", "trip", "day_out", "other"],
  }).notNull().default("other"),
  eventDate: integer("event_date", { mode: "timestamp_ms" }).notNull(),
  destination: text("destination").default(""),
  notes: text("notes").default(""),
  createdById: text("created_by_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const checklistItems = sqliteTable("checklist_items", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  scope: text("scope", { enum: ["shared", "user"] }).notNull(),
  // Required when scope === 'user'; null when 'shared'
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  quantity: integer("quantity"),
  itemNotes: text("item_notes").default(""),
  category: text("category", {
    enum: ["outfits", "documents", "toiletries", "electronics", "family_kit", "snacks", "medicines", "other"],
  }).notNull().default("other"),
  isChecked: integer("is_checked", { mode: "boolean" }).notNull().default(false),
  checkedById: text("checked_by_id").references(() => users.id, { onDelete: "set null" }),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  eventType: text("event_type", {
    enum: ["wedding", "trip", "day_out", "other"],
  }).notNull(),
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).notNull().default(false),
  // null for built-ins; user id for personal templates
  createdById: text("created_by_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const checklistTemplateItems = sqliteTable("checklist_template_items", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => checklistTemplates.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  quantity: integer("quantity"),
  category: text("category", {
    enum: ["outfits", "documents", "toiletries", "electronics", "family_kit", "snacks", "medicines", "other"],
  }).notNull().default("other"),
  sortOrder: integer("sort_order").notNull().default(0),
});
