import { z } from "zod";
import { catalogFamily, brandKey, identityName } from "@/lib/catalog";
import type { Fragrance } from "@/lib/domain";
import type { Filters } from "@/lib/discovery";
import { searchCatalog } from "@/lib/discovery";
import { FragranceSourceError } from "./scento";
import { memoryLimit } from "./memory-limits";
const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
async function request(path: string): Promise<unknown> {
  const old = cache.get(path);
  if (old && old.expires > Date.now()) return old.value;
  if (pending.has(path)) return pending.get(path)!;
  if (!memoryLimit("catalog:browse", 60, 60))
    throw new FragranceSourceError(
      "Catalog is busy. Please retry shortly.",
      429,
    );
  const task = (async () => {
    const r = await fetch("https://www.scento.com" + path, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (!r.ok)
      throw new FragranceSourceError(
        "Catalog is temporarily unavailable.",
        502,
      );
    const body = await r.text();
    if (body.length > 2_000_000)
      throw new FragranceSourceError("Invalid catalog response.");
    const value: unknown = path.startsWith("/api/") ? JSON.parse(body) : body;
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(path, { value, expires: Date.now() + 15 * 60000 });
    return value;
  })().finally(() => pending.delete(path));
  pending.set(path, task);
  return task;
}
function noteVocabulary(html: string, fallback: string[]) {
  try {
    const text = [
      ...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/g),
    ]
      .map((m) => JSON.parse(m[1])[1])
      .filter((v) => typeof v === "string")
      .join("");
    const raw = text.match(/"notes":(\[\{.*?\}\])/);
    const values: unknown = raw ? JSON.parse(raw[1]) : [];
    return [
      ...new Set([
        ...fallback,
        ...(Array.isArray(values)
          ? values.flatMap((v) =>
              v && typeof v.name === "string" ? [v.name] : [],
            )
          : []),
      ]),
    ];
  } catch {
    return fallback;
  }
}
export async function sourceFacets() {
  const [directory, notesData, noteDirectory] = await Promise.all([
    request("/brands"),
    request("/api/notes"),
    request("/notes").catch(() => ""),
  ]);
  const chunks = [
    ...String(directory).matchAll(
      /self\.__next_f\.push\((\[.*?\])\)<\/script>/g,
    ),
  ]
    .map((m) => {
      try {
        const value: unknown = JSON.parse(m[1]);
        return Array.isArray(value) && typeof value[1] === "string"
          ? value[1]
          : "";
      } catch {
        return "";
      }
    })
    .join("");
  const brands = new Map<
    string,
    { id: string; name: string; isNiche?: boolean }
  >();
  const classifications = new Map<string, boolean>();
  const brandArray = chunks.match(/"brands":(\[\{.*?\}\])/);
  if (brandArray)
    try {
      const records: unknown = JSON.parse(brandArray[1]);
      if (Array.isArray(records))
        for (const value of records)
          if (
            value &&
            typeof value.name === "string" &&
            typeof value.isNiche === "boolean"
          )
            classifications.set(brandKey(value.name), value.isNiche);
    } catch {}
  for (const m of chunks.matchAll(
    /\{"id":"((?:bra|brand)_[a-zA-Z0-9_-]+)","name":("(?:[^"\\]|\\.)*")/g,
  )) {
    const name: unknown = JSON.parse(m[2]);
    if (typeof name === "string")
      brands.set(brandKey(name), {
        id: [
          ...new Set([
            ...(brands.get(brandKey(name))?.id.split(",") || []),
            m[1],
          ]),
        ].join(","),
        name,
        isNiche: classifications.get(brandKey(name)),
      });
  }
  const parsed = z
    .object({ notes: z.array(z.object({ id: z.string(), name: z.string() })) })
    .parse(notesData);
  return {
    brands: [...brands.values()].sort((a, b) => a.name.localeCompare(b.name)),
    notes: parsed.notes,
    vocabulary: noteVocabulary(
      String(noteDirectory),
      parsed.notes.map((n) => n.name),
    ),
  };
}
const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string().regex(/^[a-z0-9-]+$/),
  subtitle: z.string().nullish(),
  brand: z.object({ name: z.string() }).nullish(),
  thumbnail: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z
    .object({
      brand_name: z.string().optional(),
      concentration: z.string().nullish(),
      launch_year: z.preprocess((value) => {
        const year = Number(value);
        return Number.isInteger(year) && year >= 1700 && year <= 2200
          ? year
          : null;
      }, z.number().nullable()),
      main_accords: z.array(z.string()).optional(),
      scent_family: z.string().nullish(),
      scent_type: z.string().nullish(),
      gender: z.string().nullish(),
      season: z.string().nullish(),
    })
    .passthrough()
    .nullish(),
  product_notes: z
    .array(
      z.object({ note_type: z.string(), note: z.object({ name: z.string() }) }),
    )
    .optional(),
});
const responseSchema = z.object({
  products: z.array(productSchema).max(24),
  totalCount: z.number().nonnegative(),
  hasNextPage: z.boolean(),
});
const accordFamilies: Record<string, string> = {
  floral: "floral",
  woody: "woody",
  fresh: "fresh",
  amber: "amber",
  warm: "amber",
  dark: "woody",
};
export async function browseSourceCatalog(
  filters: Filters,
  continuation?: string,
  options: { candidates?: boolean } = {},
) {
  const page = continuation ? Number(continuation.replace(/^browse:/, "")) : 1;
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
    throw new FragranceSourceError("Invalid catalog page.", 400);
  const facets = await sourceFacets();
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort_by: filters.sort === "name" ? "title-asc" : "curated",
  });
  if (filters.brand) {
    const brand = facets.brands.find(
      (b) => brandKey(b.name) === brandKey(filters.brand!),
    );
    if (!brand)
      return {
        results: [],
        continuation: null,
        providerTotal: 0,
        notice: "This brand is not listed in the source catalog.",
      };
    params.set("brands", brand.id);
  }
  if (filters.style === "masculine") params.set("gender", "men");
  if (filters.style === "feminine") params.set("gender", "women");
  if (filters.niche) params.set("is_niche", "true");
  const materialIds: string[] = [];
  for (const note of filters.notes || []) {
    const material = facets.notes.find(
      (n) => identityName(n.name) === identityName(note),
    );
    if (material) materialIds.push(material.id);
    else if (accordFamilies[identityName(note)])
      params.set("fragrance_family", accordFamilies[identityName(note)]);
  }
  if (materialIds.length) params.set("notes", materialIds.join(","));
  if (filters.family)
    params.set(
      "fragrance_family",
      accordFamilies[filters.family] || filters.family,
    );
  const data = responseSchema.parse(await request("/api/products?" + params));
  const results: Fragrance[] = data.products.flatMap((p) => {
    const brand = p.brand?.name || p.metadata?.brand_name || p.subtitle;
    if (!brand) return [];
    const sourceUrl = "https://www.scento.com/perfumes/" + p.handle;
    let imageUrl: string | null = null;
    try {
      const image = new URL(p.thumbnail || "");
      if (
        image.protocol === "https:" &&
        image.hostname === "imagedelivery.net" &&
        !image.pathname.includes("/campaign")
      )
        imageUrl = image.href;
    } catch {}
    const accords = p.metadata?.main_accords || [];
    return [
      {
        id: "scento-" + p.id,
        slug: p.handle,
        externalLookup: p.handle,
        niche:
          facets.brands.find(
            (house) => brandKey(house.name) === brandKey(brand),
          )?.isNiche ?? null,
        name: p.title,
        brand,
        concentration: p.metadata?.concentration || "Not provided",
        description: p.description || "No source description available.",
        year: p.metadata?.launch_year ?? null,
        perfumer: null,
        style:
          p.metadata?.gender === "men"
            ? "masculine"
            : p.metadata?.gender === "women"
              ? "feminine"
              : p.metadata?.gender === "unisex"
                ? "all"
                : "unknown",
        family: catalogFamily(
          p.metadata?.scent_type || p.metadata?.scent_family || "",
        ),
        color: "#b7a47d",
        shape: "round",
        imageUrl,
        accords,
        notes: (p.product_notes || []).map((n) => ({
          name: n.note.name,
          stage: (["top", "heart", "base"] as string[]).includes(n.note_type)
            ? (n.note_type as "top" | "heart" | "base")
            : "unclassified",
        })),
        editorialSeasons:
          p.metadata?.season === "cold-seasons"
            ? ["fall", "winter"]
            : p.metadata?.season === "warm-seasons" ||
                p.metadata?.season === "hot-seasons"
              ? ["spring", "summer"]
              : p.metadata?.season === "all-seasons"
                ? ["spring", "summer", "fall", "winter"]
                : [],
        occasions: [],
        sourceUrl,
        sourceName: "Scento public catalog",
        checkedAt: new Date().toISOString(),
        demo: false,
        rating: null,
        reviewCount: 0,
        longevity: null,
        projection: null,
        performanceVotes: 0,
        seasonVotes: {},
        offers: [],
      } satisfies Fragrance,
    ];
  });
  return {
    results: options.candidates ? results : searchCatalog(results, filters),
    continuation: data.hasNextPage ? "browse:" + (page + 1) : null,
    providerTotal: data.totalCount,
    notice: "",
  };
}
