import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const brands = sqliteTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  checkedAt: text("checked_at").notNull(),
  license: text("license").notNull(),
});
export const fragrances = sqliteTable(
  "fragrances",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    concentration: text("concentration").notNull(),
    year: integer("year"),
    perfumer: text("perfumer"),
    style: text("style").notNull(),
    family: text("family").notNull(),
    color: text("color").notNull(),
    shape: text("shape").notNull(),
    imageUrl: text("image_url"),
    editorialSeasons: text("editorial_seasons").notNull(),
    occasions: text("occasions").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    demo: integer("demo", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("fragrance_name_idx").on(t.name),
    index("fragrance_brand_idx").on(t.brandId),
    index("fragrance_family_idx").on(t.family),
  ],
);
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});
export const fragranceNotes = sqliteTable(
  "fragrance_notes",
  {
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id),
    stage: text("stage").notNull(),
    order: integer("display_order").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.fragranceId, t.noteId, t.stage] }),
    index("notes_lookup_idx").on(t.noteId),
  ],
);
export const accords = sqliteTable("accords", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});
export const fragranceAccords = sqliteTable(
  "fragrance_accords",
  {
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    accordId: text("accord_id")
      .notNull()
      .references(() => accords.id),
    rank: integer("rank").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.fragranceId, t.accordId] })],
);
export const aliases = sqliteTable("fragrance_aliases", {
  id: text("id").primaryKey(),
  fragranceId: text("fragrance_id")
    .notNull()
    .references(() => fragrances.id, { onDelete: "cascade" }),
  alias: text("alias").notNull().unique(),
});
export const externalIds = sqliteTable(
  "external_identifiers",
  {
    id: text("id").primaryKey(),
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    value: text("value").notNull(),
  },
  (t) => [uniqueIndex("external_provider_value").on(t.provider, t.value)],
);
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(),
});
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    longevity: real("longevity"),
    projection: text("projection"),
    season: text("season"),
    occasion: text("occasion"),
    status: text("status").notNull().default("published"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("one_review_per_user").on(t.userId, t.fragranceId),
    index("review_status_fragrance").on(t.status, t.fragranceId),
    check("rating_range", sql`${t.rating} between 1 and 5`),
    check(
      "longevity_range",
      sql`${t.longevity} is null or (${t.longevity} >= 0.5 and ${t.longevity} <= 48)`,
    ),
  ],
);
export const helpfulVotes = sqliteTable(
  "helpful_votes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.reviewId] })],
);
export const reports = sqliteTable(
  "review_reports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("one_report").on(t.userId, t.reviewId)],
);
export const collections = sqliteTable(
  "collections",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fragranceId: text("fragrance_id")
      .notNull()
      .references(() => fragrances.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.fragranceId] })],
);
export const retailers = sqliteTable("retailers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  regions: text("regions").notNull(),
  status: text("status").notNull().default("active"),
});
export const variants = sqliteTable("fragrance_variants", {
  id: text("id").primaryKey(),
  fragranceId: text("fragrance_id")
    .notNull()
    .references(() => fragrances.id, { onDelete: "cascade" }),
  concentration: text("concentration").notNull(),
  size: real("size").notNull(),
  packaging: text("packaging").notNull(),
  condition: text("condition").notNull(),
});
export const offers = sqliteTable(
  "retailer_offers",
  {
    id: text("id").primaryKey(),
    retailerId: text("retailer_id")
      .notNull()
      .references(() => retailers.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    price: real("price").notNull(),
    currency: text("currency").notNull(),
    region: text("region").notNull(),
    shipping: real("shipping"),
    tax: real("tax"),
    inStock: integer("in_stock", { mode: "boolean" }).notNull(),
    verifiedAt: text("verified_at").notNull(),
    url: text("url").notNull(),
    affiliateUrl: text("affiliate_url"),
    source: text("source").notNull(),
  },
  (t) => [
    index("offers_variant_verified").on(t.variantId, t.verifiedAt),
    check("positive_price", sql`${t.price}>0`),
  ],
);
export const audit = sqliteTable("admin_audit", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: text("created_at").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const aiUsage = sqliteTable("ai_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: text("created_at").notNull(),
});
export const recommendationSessions = sqliteTable("recommendation_sessions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  criteria: text("criteria").notNull(),
  updatedAt: text("updated_at").notNull(),
});
