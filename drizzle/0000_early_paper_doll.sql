CREATE TABLE `accords` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accords_name_unique` ON `accords` (`name`);--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fragrance_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`fragrance_id` text NOT NULL,
	`alias` text NOT NULL,
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fragrance_aliases_alias_unique` ON `fragrance_aliases` (`alias`);--> statement-breakpoint
CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_unique` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `collections` (
	`user_id` text NOT NULL,
	`fragrance_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `fragrance_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `external_identifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`fragrance_id` text NOT NULL,
	`provider` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_provider_value` ON `external_identifiers` (`provider`,`value`);--> statement-breakpoint
CREATE TABLE `fragrance_accords` (
	`fragrance_id` text NOT NULL,
	`accord_id` text NOT NULL,
	`rank` integer NOT NULL,
	`source_id` text NOT NULL,
	PRIMARY KEY(`fragrance_id`, `accord_id`),
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accord_id`) REFERENCES `accords`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fragrance_notes` (
	`fragrance_id` text NOT NULL,
	`note_id` text NOT NULL,
	`stage` text NOT NULL,
	`display_order` integer NOT NULL,
	PRIMARY KEY(`fragrance_id`, `note_id`, `stage`),
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notes_lookup_idx` ON `fragrance_notes` (`note_id`);--> statement-breakpoint
CREATE TABLE `fragrances` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`brand_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`concentration` text NOT NULL,
	`year` integer,
	`perfumer` text,
	`style` text NOT NULL,
	`family` text NOT NULL,
	`color` text NOT NULL,
	`shape` text NOT NULL,
	`image_url` text,
	`editorial_seasons` text NOT NULL,
	`occasions` text NOT NULL,
	`source_id` text NOT NULL,
	`demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fragrances_slug_unique` ON `fragrances` (`slug`);--> statement-breakpoint
CREATE INDEX `fragrance_name_idx` ON `fragrances` (`name`);--> statement-breakpoint
CREATE INDEX `fragrance_brand_idx` ON `fragrances` (`brand_id`);--> statement-breakpoint
CREATE INDEX `fragrance_family_idx` ON `fragrances` (`family`);--> statement-breakpoint
CREATE TABLE `helpful_votes` (
	`user_id` text NOT NULL,
	`review_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `review_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notes_name_unique` ON `notes` (`name`);--> statement-breakpoint
CREATE TABLE `retailer_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`retailer_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`price` real NOT NULL,
	`currency` text NOT NULL,
	`region` text NOT NULL,
	`shipping` real,
	`tax` real,
	`in_stock` integer NOT NULL,
	`verified_at` text NOT NULL,
	`url` text NOT NULL,
	`affiliate_url` text,
	`source` text NOT NULL,
	FOREIGN KEY (`retailer_id`) REFERENCES `retailers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `fragrance_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "positive_price" CHECK("retailer_offers"."price">0)
);
--> statement-breakpoint
CREATE INDEX `offers_variant_verified` ON `retailer_offers` (`variant_id`,`verified_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendation_sessions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`criteria` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`review_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_report` ON `review_reports` (`user_id`,`review_id`);--> statement-breakpoint
CREATE TABLE `retailers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text NOT NULL,
	`regions` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fragrance_id` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`longevity` real,
	`projection` text,
	`season` text,
	`occasion` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "rating_range" CHECK("reviews"."rating" between 1 and 5),
	CONSTRAINT "longevity_range" CHECK("reviews"."longevity" is null or ("reviews"."longevity" >= 0.5 and "reviews"."longevity" <= 48))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_review_per_user` ON `reviews` (`user_id`,`fragrance_id`);--> statement-breakpoint
CREATE INDEX `review_status_fragrance` ON `reviews` (`status`,`fragrance_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`checked_at` text NOT NULL,
	`license` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fragrance_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`fragrance_id` text NOT NULL,
	`concentration` text NOT NULL,
	`size` real NOT NULL,
	`packaging` text NOT NULL,
	`condition` text NOT NULL,
	FOREIGN KEY (`fragrance_id`) REFERENCES `fragrances`(`id`) ON UPDATE no action ON DELETE cascade
);
