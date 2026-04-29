CREATE TABLE IF NOT EXISTS `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `checklist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`scope` text NOT NULL,
	`user_id` text,
	`text` text NOT NULL,
	`quantity` integer,
	`item_notes` text DEFAULT '',
	`category` text DEFAULT 'other' NOT NULL,
	`is_checked` integer DEFAULT false NOT NULL,
	`checked_by_id` text,
	`checked_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `checklist_template_items` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`text` text NOT NULL,
	`quantity` integer,
	`category` text DEFAULT 'other' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `checklist_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`event_type` text NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`source_app` text NOT NULL,
	`source_app_other` text DEFAULT '',
	`code` text,
	`description` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`expiry_date` integer NOT NULL,
	`min_order_value` real,
	`max_discount_value` real,
	`notes` text DEFAULT '',
	`url` text DEFAULT '',
	`image_path` text,
	`is_private` integer DEFAULT false NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`used_by_id` text,
	`used_at` integer,
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`used_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`event_type` text DEFAULT 'other' NOT NULL,
	`event_date` integer NOT NULL,
	`destination` text DEFAULT '',
	`notes` text DEFAULT '',
	`created_by_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `larder_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`quantity` text DEFAULT '',
	`item_notes` text DEFAULT '',
	`category` text DEFAULT 'other' NOT NULL,
	`is_bought` integer DEFAULT false NOT NULL,
	`bought_by_id` text,
	`bought_at` integer,
	`added_by_id` text NOT NULL,
	`added_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`bought_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`added_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `location_images` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`file_path` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `location_tags` (
	`location_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`location_id`, `tag_id`),
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`address` text NOT NULL,
	`category` text DEFAULT 'restaurant' NOT NULL,
	`cuisine` text DEFAULT '[]',
	`price_range` integer DEFAULT 2,
	`source_url` text DEFAULT '',
	`source_type` text DEFAULT 'manual' NOT NULL,
	`added_by` text NOT NULL,
	`visited` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`push_enabled` integer DEFAULT false NOT NULL,
	`push_subscription` text,
	`email_enabled` integer DEFAULT false NOT NULL,
	`email_address` text,
	`whatsapp_enabled` integer DEFAULT false NOT NULL,
	`whatsapp_number` text,
	`days_before_expiry` integer DEFAULT 3 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reminder_log` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`notes` text DEFAULT '',
	`visited_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);