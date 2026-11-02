import { z } from "zod";
import type { LiveProfile, LiveSearch } from "@/lib/live-catalog";
import { memoryLimit } from "./memory-limits";

const base = "https://www.scento.com/api/perfume/v1/";
const text = z.string().trim().min(1).max(250);
const sourceUrl = z
  .string()
  .url()
  .refine((url) => new URL(url).origin === "https://www.scento.com");
const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
const cacheMilliseconds = 15 * 60 * 1000;
export class FragranceSourceError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
async function request(path: string): Promise<unknown> {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(path)) return pending.get(path)!;
  if (!memoryLimit("scento:upstream", 60, 60))
    throw new FragranceSourceError(
      "Fragrance searches are busy. Please try again in a minute.",
      429,
    );
  const promise = (async () => {
    try {
      const response = await fetch(base + path, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 429)
        throw new FragranceSourceError(
          "The fragrance source is busy. Please try again shortly.",
          429,
        );
      if (!response.ok)
        throw new FragranceSourceError(
          response.status === 404
            ? "This fragrance is not available from the source."
            : "The fragrance source is temporarily unavailable.",
          response.status === 404 ? 404 : 502,
        );
      if (Number(response.headers.get("content-length") || 0) > 2_000_000)
        throw new FragranceSourceError(
          "The fragrance source returned an invalid response.",
        );
      const body = await response.text();
      if (body.length > 2_000_000)
        throw new FragranceSourceError(
          "The fragrance source returned an invalid response.",
        );
      const value: unknown = JSON.parse(body);
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(path, { value, expires: Date.now() + cacheMilliseconds });
      return value;
    } catch (error) {
      if (error instanceof FragranceSourceError) throw error;
      throw new FragranceSourceError(
        "The fragrance source is temporarily unavailable. Please try again.",
      );
    } finally {
      pending.delete(path);
    }
  })();
  pending.set(path, promise);
  return promise;
}
const searchSchema = z.object({
  folio: z.literal("perfume-search"),
  detail: z.object({
    total: z.number().int().nonnegative(),
    matches: z
      .array(
        z.object({
          kind: z.literal("perfume"),
          name: text,
          house: text,
          family: z.string().max(250).nullish(),
          page: sourceUrl,
        }),
      )
      .max(100),
  }),
  continuation: z.string().max(2000).nullable().optional(),
});
export async function searchLiveFragrances(
  query: string,
  continuation?: string,
): Promise<LiveSearch> {
  const q = z.string().trim().min(2).max(150).parse(query);
  const cursor = z.string().max(2000).optional().parse(continuation);
  const parameters = new URLSearchParams({ q, kind: "perfume" });
  if (cursor) parameters.set("continuation", cursor);
  const parsed = searchSchema.safeParse(await request("search?" + parameters));
  if (!parsed.success)
    throw new FragranceSourceError(
      "The fragrance source returned an unexpected response.",
    );
  return {
    query: q,
    total: parsed.data.detail.total,
    matches: parsed.data.detail.matches.map((record) => ({
      name: record.name,
      brand: record.house,
      family: record.family || "Not provided",
      sourceUrl: record.page,
      lookup: record.page.includes("/perfumes/")
        ? new URL(record.page).pathname.split("/").filter(Boolean).at(-1)!
        : `${record.name} ${record.house}`,
    })),
    continuation: parsed.data.continuation || null,
    source: "Scento Perfume API",
  };
}
const strings = z.array(z.string().max(200)).max(100);
const profileSchema = z.object({
  folio: z.literal("perfume-portrait"),
  detail: z.object({
    name: text,
    house: text,
    year: z.number().int().nullable().optional(),
    perfumer: z.string().max(500).nullable().optional(),
    concentration: z.string().max(150).nullable().optional(),
    family: z.string().max(250).nullable().optional(),
    subfamily: z.string().max(250).nullable().optional(),
    character: z.string().max(5000).nullable().optional(),
    pyramid: z
      .object({
        top: strings.optional(),
        heart: strings.optional(),
        base: strings.optional(),
      })
      .nullable()
      .optional(),
    notes: strings.nullable().optional(),
    wears: z.object({ seasons: strings.optional() }).nullable().optional(),
  }),
  scento_page: z.object({ url: sourceUrl }),
});
export async function getLiveFragrance(lookup: string): Promise<LiveProfile> {
  const key = z.string().trim().min(1).max(250).parse(lookup);
  const parsed = profileSchema.safeParse(
    await request("perfumes/" + encodeURIComponent(key)),
  );
  if (!parsed.success)
    throw new FragranceSourceError(
      "This fragrance profile is not available from the source.",
      404,
    );
  const detail = parsed.data.detail;
  return {
    name: detail.name,
    brand: detail.house,
    year: detail.year ?? null,
    perfumer: detail.perfumer || null,
    concentration: detail.concentration || null,
    family: detail.family || "Not provided",
    subfamily: detail.subfamily || null,
    description:
      detail.character || "The source has not provided a scent description.",
    pyramid: {
      top: detail.pyramid?.top || [],
      heart: detail.pyramid?.heart || [],
      base: detail.pyramid?.base || [],
    },
    notes: detail.notes || [],
    seasons: detail.wears?.seasons || [],
    sourceUrl: parsed.data.scento_page.url,
    checkedAt: new Date().toISOString(),
    source: "Scento Perfume API",
  };
}
