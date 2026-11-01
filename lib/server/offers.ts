import { env } from "cloudflare:workers";
import { offerSchema, slugify, type Offer } from "@/lib/domain";
/** Authorized feeds implement this interface. No scraping adapter is enabled. */
export interface RetailerAdapter {
  name: string;
  regions: ("CA" | "US")[];
  fetchAuthorizedOffers(): Promise<unknown[]>;
}
export const retailerIntegrations = [
  { name: "FragranceBuy", region: "CA", status: "Not connected" },
  { name: "FragranceNet", region: "US", status: "Not connected" },
  { name: "Jomashop", region: "US", status: "Not connected" },
  { name: "FragranceX", region: "US", status: "Not connected" },
];
export async function saveOffer(input: Offer) {
  const o = offerSchema.parse(input),
    rid = slugify(o.retailer),
    vid = slugify(
      `${o.fragranceId}-${o.concentration}-${o.size}-${o.packaging}-${o.condition}`,
    );
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO retailers (id,name,website,regions,status) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,website=excluded.website",
    ).bind(
      rid,
      o.retailer,
      new URL(o.url).origin,
      JSON.stringify([o.region]),
      "active",
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO fragrance_variants (id,fragrance_id,concentration,size,packaging,condition) VALUES (?,?,?,?,?,?)",
    ).bind(
      vid,
      o.fragranceId,
      o.concentration,
      o.size,
      o.packaging,
      o.condition,
    ),
    env.DB.prepare(
      "INSERT INTO retailer_offers (id,retailer_id,variant_id,price,currency,region,shipping,tax,in_stock,verified_at,url,affiliate_url,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET retailer_id=excluded.retailer_id,variant_id=excluded.variant_id,price=excluded.price,currency=excluded.currency,region=excluded.region,shipping=excluded.shipping,tax=excluded.tax,in_stock=excluded.in_stock,verified_at=excluded.verified_at,url=excluded.url,affiliate_url=excluded.affiliate_url,source=excluded.source",
    ).bind(
      o.id,
      rid,
      vid,
      o.price,
      o.currency,
      o.region,
      o.shipping,
      o.tax,
      Number(o.inStock),
      o.verifiedAt,
      o.url,
      o.affiliateUrl,
      o.source,
    ),
  ]);
}
