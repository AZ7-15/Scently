import { z } from "zod";

export const seasons = ["spring", "summer", "fall", "winter"] as const;
export const projections = [
  "intimate",
  "moderate",
  "strong",
  "very strong",
] as const;
export const collectionStatuses = [
  "wishlist",
  "owned",
  "tried",
  "test",
] as const;
export type Season = (typeof seasons)[number];
export type Projection = (typeof projections)[number];
export type CollectionStatus = (typeof collectionStatuses)[number];
export interface Note {
  name: string;
  stage: "top" | "heart" | "base" | "unclassified";
}
export interface Fragrance {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  concentration: string;
  year: number | null;
  perfumer: string | null;
  style: string;
  family: string;
  color: string;
  shape: string;
  imageUrl: string | null;
  accords: string[];
  notes: Note[];
  editorialSeasons: Season[];
  occasions: string[];
  sourceUrl: string;
  sourceName: string;
  checkedAt: string;
  demo: boolean;
  rating: number | null;
  reviewCount: number;
  longevity: number | null;
  projection: Projection | null;
  performanceVotes: number;
  seasonVotes: Record<string, number>;
  offers: Offer[];
}
export interface Offer {
  id: string;
  fragranceId: string;
  retailer: string;
  size: number;
  concentration: string;
  packaging: "retail" | "tester";
  condition: "new" | "used";
  price: number;
  currency: "CAD" | "USD";
  region: "CA" | "US";
  shipping: number | null;
  tax: number | null;
  inStock: boolean;
  verifiedAt: string;
  url: string;
  affiliateUrl: string | null;
  source: string;
}
export interface Review {
  id: string;
  fragranceId: string;
  userId: string;
  username: string;
  rating: number;
  content: string;
  longevity: number | null;
  projection: Projection | null;
  season: Season | null;
  occasion: string | null;
  createdAt: string;
  helpful: number;
  voted: boolean;
  status: "published" | "pending" | "hidden";
}
export const httpsUrl = z
  .string()
  .url()
  .refine(
    (s) => URL.canParse(s) && new URL(s).protocol === "https:",
    "Use an HTTPS URL",
  );
export const reviewSchema = z.object({
  fragranceId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(15, "Write at least 15 characters.").max(3000),
  longevity: z.number().min(0.5).max(48).nullable().default(null),
  projection: z.enum(projections).nullable().default(null),
  season: z.enum(seasons).nullable().default(null),
  occasion: z.string().trim().max(80).nullable().default(null),
});
export const fragranceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,100}$/),
  slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(1200),
  concentration: z.string().min(2).max(60),
  year: z.number().int().min(1700).max(2100).nullable().default(null),
  perfumer: z.string().max(100).nullable().default(null),
  style: z.string().max(60).default("all"),
  family: z.string().max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#b39b70"),
  shape: z.enum(["square", "round", "tall"]).default("square"),
  imageUrl: z
    .union([
      httpsUrl,
      z.string().regex(/^\/images\/products\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/),
    ])
    .nullable()
    .default(null),
  accords: z.array(z.string().trim().min(1).max(50)).max(8),
  notes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        stage: z.enum(["top", "heart", "base", "unclassified"]),
      }),
    )
    .max(40),
  editorialSeasons: z.array(z.enum(seasons)).max(4),
  occasions: z.array(z.string().max(40)).max(8).default([]),
  sourceUrl: httpsUrl,
  sourceName: z.string().min(2).max(150),
  checkedAt: z
    .string()
    .datetime()
    .refine(
      (s) => new Date(s).getTime() <= Date.now() + 60000,
      "Source verification cannot be in the future",
    ),
  demo: z.boolean().default(false),
});
export const offerSchema = z
  .object({
    id: z.string().min(2).max(100),
    fragranceId: z.string().min(2).max(100),
    retailer: z.string().min(2).max(100),
    size: z.number().positive().max(2000),
    concentration: z.string().min(2).max(60),
    packaging: z.enum(["retail", "tester"]),
    condition: z.enum(["new", "used"]),
    price: z.number().positive().max(100000),
    currency: z.enum(["CAD", "USD"]),
    region: z.enum(["CA", "US"]),
    shipping: z.number().nonnegative().nullable(),
    tax: z.number().nonnegative().nullable(),
    inStock: z.boolean(),
    verifiedAt: z.string().datetime(),
    url: httpsUrl,
    affiliateUrl: httpsUrl.nullable(),
    source: z.string().min(3).max(300),
  })
  .refine(
    (o) => new Date(o.verifiedAt).getTime() <= Date.now() + 60000,
    "Verification cannot be in the future",
  );
export const criteriaSchema = z.object({
  notes: z.array(z.string().max(60)).max(15).default([]),
  excludeNotes: z.array(z.string().max(60)).max(15).default([]),
  season: z.enum(seasons).nullable().default(null),
  occasion: z.string().max(60).nullable().default(null),
  style: z.string().max(60).nullable().default(null),
  projection: z.enum(projections).nullable().default(null),
  minHours: z.number().min(0).max(48).nullable().default(null),
  maxHours: z.number().min(0).max(48).nullable().default(null),
  budget: z.number().positive().max(100000).nullable().default(null),
  hardBudget: z.boolean().default(false),
  hardNotes: z.boolean().default(false),
  niche: z.boolean().default(false),
  sortLongevity: z.boolean().default(false),
});
export type Criteria = z.infer<typeof criteriaSchema>;
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const slugify = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const brandConfig = {
  name: "Scently",
  tagline: "Discover your next signature scent.",
  origin:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:5173",
};
