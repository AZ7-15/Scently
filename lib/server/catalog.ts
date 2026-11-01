import { env } from "@/db/runtime";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as s from "@/db/schema";
import { curatedCatalog } from "@/data/catalog";
import {
  slugify,
  type Fragrance,
  type Note,
  type Offer,
  type Projection,
  type Review,
} from "@/lib/domain";
let seedPromise: Promise<void> | undefined;
export async function ensureCatalog() {
  if (!seedPromise)
    seedPromise = (async () => {
      for (const f of curatedCatalog) {
        const exists = await env.DB.prepare(
          "SELECT id FROM fragrances WHERE id=?",
        )
          .bind(f.id)
          .first();
        if (!exists) await saveFragrance(f, false);
        else if (f.imageUrl)
          await env.DB.prepare(
            "UPDATE fragrances SET image_url=? WHERE id=? AND image_url IS NULL",
          )
            .bind(f.imageUrl, f.id)
            .run();
      }
    })().catch((e) => {
      seedPromise = undefined;
      throw e;
    });
  await seedPromise;
}
export async function saveFragrance(
  f: Pick<
    Fragrance,
    | "id"
    | "slug"
    | "brand"
    | "name"
    | "description"
    | "concentration"
    | "year"
    | "perfumer"
    | "style"
    | "family"
    | "color"
    | "shape"
    | "imageUrl"
    | "editorialSeasons"
    | "occasions"
    | "sourceUrl"
    | "sourceName"
    | "checkedAt"
    | "demo"
    | "notes"
    | "accords"
  >,
  overwrite: boolean,
) {
  const now = new Date().toISOString(),
    brandId = slugify(f.brand),
    sourceId = `source-${f.id}`;
  const statements = [
    env.DB.prepare(
      "INSERT OR IGNORE INTO brands (id,name,slug) VALUES (?,?,?)",
    ).bind(brandId, f.brand, brandId),
    env.DB.prepare(
      `INSERT INTO sources (id,name,url,checked_at,license) VALUES (?,?,?,?,?) ON CONFLICT(id) DO ${overwrite ? "UPDATE SET name=excluded.name,url=excluded.url,checked_at=excluded.checked_at" : "NOTHING"}`,
    ).bind(
      sourceId,
      f.sourceName,
      f.sourceUrl,
      f.checkedAt,
      "Factual manual curation; imagery and descriptive copy not licensed for reuse.",
    ),
    env.DB.prepare(
      `INSERT INTO fragrances (id,slug,brand_id,name,description,concentration,year,perfumer,style,family,color,shape,image_url,editorial_seasons,occasions,source_id,demo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO ${overwrite ? "UPDATE SET slug=excluded.slug,brand_id=excluded.brand_id,name=excluded.name,description=excluded.description,concentration=excluded.concentration,year=excluded.year,perfumer=excluded.perfumer,style=excluded.style,family=excluded.family,color=excluded.color,shape=excluded.shape,image_url=excluded.image_url,editorial_seasons=excluded.editorial_seasons,occasions=excluded.occasions,source_id=excluded.source_id,demo=excluded.demo,updated_at=excluded.updated_at" : "NOTHING"}`,
    ).bind(
      f.id,
      f.slug,
      brandId,
      f.name,
      f.description,
      f.concentration,
      f.year,
      f.perfumer,
      f.style,
      f.family,
      f.color,
      f.shape,
      f.imageUrl,
      JSON.stringify(f.editorialSeasons),
      JSON.stringify(f.occasions),
      sourceId,
      Number(f.demo),
      now,
      now,
    ),
  ];
  if (overwrite)
    statements.push(
      env.DB.prepare("DELETE FROM fragrance_notes WHERE fragrance_id=?").bind(
        f.id,
      ),
      env.DB.prepare("DELETE FROM fragrance_accords WHERE fragrance_id=?").bind(
        f.id,
      ),
    );
  f.notes.forEach((n, i) => {
    const id = slugify(n.name);
    statements.push(
      env.DB.prepare("INSERT OR IGNORE INTO notes (id,name) VALUES (?,?)").bind(
        id,
        n.name,
      ),
      env.DB.prepare(
        "INSERT OR IGNORE INTO fragrance_notes (fragrance_id,note_id,stage,display_order) VALUES (?,?,?,?)",
      ).bind(f.id, id, n.stage, i),
    );
  });
  f.accords.forEach((a, i) => {
    const id = slugify(a);
    statements.push(
      env.DB.prepare(
        "INSERT OR IGNORE INTO accords (id,name) VALUES (?,?)",
      ).bind(id, a),
      env.DB.prepare(
        "INSERT OR IGNORE INTO fragrance_accords (fragrance_id,accord_id,rank,source_id) VALUES (?,?,?,?)",
      ).bind(f.id, id, i, sourceId),
    );
  });
  await env.DB.batch(statements);
}
export async function getCatalog(): Promise<Fragrance[]> {
  await ensureCatalog();
  const db = getDb();
  const [fs, bs, ss, ns, fns, acs, fas, rs, os, vs, rts] = await Promise.all([
    db.select().from(s.fragrances),
    db.select().from(s.brands),
    db.select().from(s.sources),
    db.select().from(s.notes),
    db.select().from(s.fragranceNotes),
    db.select().from(s.accords),
    db.select().from(s.fragranceAccords),
    db.select().from(s.reviews).where(eq(s.reviews.status, "published")),
    db.select().from(s.offers),
    db.select().from(s.variants),
    db.select().from(s.retailers),
  ]);
  return fs.map((f) => {
    const source = ss.find((v) => v.id === f.sourceId)!,
      reviews = rs.filter((r) => r.fragranceId === f.id);
    const hours = reviews
      .flatMap((r) => (r.longevity === null ? [] : [r.longevity]))
      .sort((a, b) => a - b);
    const ps = reviews.flatMap((r) => (r.projection ? [r.projection] : []));
    const mode = ps.length
      ? ([...new Set(ps)].sort(
          (a, b) =>
            ps.filter((p) => p === b).length - ps.filter((p) => p === a).length,
        )[0] as Projection)
      : null;
    return {
      ...f,
      brand: bs.find((b) => b.id === f.brandId)!.name,
      sourceUrl: source.url,
      sourceName: source.name,
      checkedAt: source.checkedAt,
      editorialSeasons: JSON.parse(f.editorialSeasons),
      occasions: JSON.parse(f.occasions),
      notes: fns
        .filter((n) => n.fragranceId === f.id)
        .sort((a, b) => a.order - b.order)
        .map((n) => ({
          name: ns.find((v) => v.id === n.noteId)!.name,
          stage: n.stage as Note["stage"],
        })),
      accords: fas
        .filter((a) => a.fragranceId === f.id)
        .sort((a, b) => a.rank - b.rank)
        .map((a) => acs.find((v) => v.id === a.accordId)!.name),
      rating: reviews.length
        ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
        : null,
      reviewCount: reviews.length,
      longevity: hours.length
        ? hours.length % 2
          ? hours[(hours.length - 1) / 2]
          : (hours[hours.length / 2 - 1] + hours[hours.length / 2]) / 2
        : null,
      projection: mode,
      performanceVotes: hours.length,
      seasonVotes: Object.fromEntries(
        ["spring", "summer", "fall", "winter"].map((season) => [
          season,
          reviews.filter((r) => r.season === season).length,
        ]),
      ),
      offers: os.flatMap((o) => {
        const v = vs.find(
            (v) => v.id === o.variantId && v.fragranceId === f.id,
          ),
          retailer = rts.find((r) => r.id === o.retailerId);
        return v && retailer?.status === "active"
          ? [
              {
                ...o,
                fragranceId: f.id,
                retailer: retailer.name,
                size: v.size,
                packaging: v.packaging,
                condition: v.condition,
                concentration: v.concentration,
              } as Offer,
            ]
          : [];
      }),
    };
  });
}
export async function getReviews(
  userId?: string,
  fragranceId?: string,
  includeHidden = false,
): Promise<Review[]> {
  const db = getDb();
  const [rs, us, hvs] = await Promise.all([
    db.select().from(s.reviews),
    db.select().from(s.users),
    db.select().from(s.helpfulVotes),
  ]);
  return rs
    .filter(
      (r) =>
        (includeHidden || r.status === "published" || r.userId === userId) &&
        (!fragranceId || r.fragranceId === fragranceId),
    )
    .map((r) => ({
      ...r,
      username:
        us.find((u) => u.id === r.userId)?.displayName ?? "Community member",
      projection: r.projection as Review["projection"],
      season: r.season as Review["season"],
      status: r.status as Review["status"],
      helpful: hvs.filter((v) => v.reviewId === r.id).length,
      voted: hvs.some((v) => v.reviewId === r.id && v.userId === userId),
    }));
}
