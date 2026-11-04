import { z } from "zod";
import bundled from "@/data/scento-open-catalog.json";
import {
  catalogFamily,
  concentrationKey,
  matchingCatalogEdition,
  fragranceKey,
} from "@/lib/catalog";
import { seasons, type Fragrance, type Note } from "@/lib/domain";
import type { LiveProfile } from "@/lib/live-catalog";
import { bestsellerRankFor } from "@/lib/popularity";
const strings = z.array(z.string().max(300)).max(200);
const rowSchema = z.object({
  id: z.string().min(1).max(300),
  name: z.string().min(1).max(300),
  house: z.string().min(1).max(250),
  year: z.number().int().min(1700).max(2200).nullable(),
  perfumers: strings,
  concentration: z.string().max(150).nullable(),
  family: z.string().max(250),
  secondary_family: z.string().max(250),
  character: strings,
  seasons: strings,
  top_notes: strings,
  heart_notes: strings,
  base_notes: strings,
  notes: strings,
  description: z.string().max(6000),
  popularity_rank: z.number().int().positive().nullable().optional(),
  url: z
    .string()
    .url()
    .refine(
      (v) => URL.canParse(v) && new URL(v).origin === "https://www.scento.com",
    ),
});
const rowsSchema = z.array(rowSchema).min(1).max(10000);
type Row = z.infer<typeof rowSchema>;
const labels: Record<string, string> = {
  edp: "Eau de Parfum",
  edt: "Eau de Toilette",
  edc: "Eau de Cologne",
  parfum: "Parfum",
  extrait: "Extrait de Parfum",
  elixir: "Elixir",
};
export function mapOpenCatalog(
  rows: unknown,
  date = "2026-10-29",
): Fragrance[] {
  const sourceRows = rowsSchema.parse(rows);
  const identities = sourceRows.map((candidate) => ({
    name: candidate.name,
    brand: candidate.house,
    concentration: candidate.concentration || "Not provided",
  }));
  const fragrances = sourceRows.map((r: Row) => {
    const notes: Note[] = (["top", "heart", "base"] as const).flatMap((stage) =>
      r[(stage + "_notes") as "top_notes" | "heart_notes" | "base_notes"].map(
        (name) => ({ name, stage }),
      ),
    );
    for (const name of r.notes)
      if (!notes.some((n) => n.name.toLowerCase() === name.toLowerCase()))
        notes.push({ name, stage: "unclassified" });
    return {
      id: "open-" + r.id,
      slug: r.id,
      externalLookup: "open:" + r.id,
      name: r.name,
      brand: r.house,
      description: r.description || "No source description is available.",
      concentration: r.concentration
        ? labels[concentrationKey(r.concentration)] || r.concentration
        : "Not provided",
      year: r.year,
      perfumer: r.perfumers.length ? r.perfumers.join(", ") : null,
      style: "unknown",
      family: catalogFamily(r.family),
      color: "#b7a47d",
      shape: "round",
      imageUrl: null,
      popularityRank: r.popularity_rank ?? null,
      bestsellerRank: bestsellerRankFor(
        {
          name: r.name,
          brand: r.house,
          concentration: r.concentration || "Not provided",
        },
        identities,
      ),
      accords: [
        ...new Set(
          [r.family, r.secondary_family, ...r.character].filter(Boolean),
        ),
      ],
      notes,
      editorialSeasons: r.seasons
        .map((s) => (s === "autumn" ? "fall" : s))
        .filter((s): s is (typeof seasons)[number] =>
          (seasons as readonly string[]).includes(s),
        ),
      occasions: [],
      sourceUrl: r.url,
      sourceName: "Scento Open Dataset (CC BY 4.0)",
      checkedAt: date + "T00:00:00.000Z",
      demo: false,
      rating: null,
      reviewCount: 0,
      longevity: null,
      projection: null,
      performanceVotes: 0,
      seasonVotes: {},
      offers: [],
    };
  });
  return fragrances;
}
let catalog = mapOpenCatalog(bundled);
let expires = 0;
let pending: Promise<Fragrance[]> | undefined;
export async function getOpenCatalog(): Promise<Fragrance[]> {
  if (expires > Date.now()) return catalog;
  if (pending) return pending;
  pending = (async () => {
    try {
      // A licensed published export, not a crawl of API search pages.
      const base =
        "https://huggingface.co/datasets/scento/perfume-database/resolve/main/";
      const [data, meta] = await Promise.all([
        fetch(base + "perfumes.jsonl", { signal: AbortSignal.timeout(8000) }),
        fetch(base + "datapackage.json", { signal: AbortSignal.timeout(8000) }),
      ]);
      if (!data.ok || !meta.ok) throw new Error("Dataset unavailable");
      const descriptor = (await meta.json()) as {
        version?: string;
        licenses?: { name?: string }[];
      };
      if (!descriptor.licenses?.some((l) => l.name === "CC-BY-4.0"))
        throw new Error("Dataset license changed");
      const date = descriptor.version?.replaceAll(".", "-");
      if (
        !date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        Date.parse(date) > Date.now()
      )
        throw new Error("Invalid dataset date");
      const text = await data.text();
      if (text.length > 6_000_000) throw new Error("Dataset too large");
      catalog = mapOpenCatalog(
        text
          .trim()
          .split(/\r?\n/)
          .map((line) => JSON.parse(line)),
        date,
      );
      expires = Date.now() + 24 * 3600000;
    } catch {
      expires = Date.now() + 5 * 60000;
    }
    return catalog;
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}
export async function getOpenProfile(
  lookup: string,
): Promise<LiveProfile | null> {
  if (!lookup.startsWith("open:")) return null;
  const f = (await getOpenCatalog()).find((f) => f.externalLookup === lookup);
  if (!f) return null;
  return {
    name: f.name,
    brand: f.brand,
    year: f.year,
    perfumer: f.perfumer,
    concentration: f.concentration === "Not provided" ? null : f.concentration,
    family: f.accords[0] || "Not provided",
    subfamily: null,
    description: f.description,
    pyramid: {
      top: f.notes.filter((n) => n.stage === "top").map((n) => n.name),
      heart: f.notes.filter((n) => n.stage === "heart").map((n) => n.name),
      base: f.notes.filter((n) => n.stage === "base").map((n) => n.name),
    },
    notes: f.notes.filter((n) => n.stage === "unclassified").map((n) => n.name),
    seasons: f.editorialSeasons,
    sourceUrl: f.sourceUrl,
    source: f.sourceName,
    checkedAt: f.checkedAt,
  };
}

/** Fill absent live-profile fields from an exact edition in the published index. */
export async function supplementLiveProfile<T extends LiveProfile>(
  profile: T,
): Promise<T & LiveProfile> {
  const matches = (await getOpenCatalog()).filter((fragrance) =>
    matchingCatalogEdition(
      {
        name: profile.name,
        brand: profile.brand,
        concentration: profile.concentration || "Not provided",
      },
      fragrance,
    ),
  );
  const strengths = new Set(
    matches.map((fragrance) => concentrationKey(fragrance.concentration)),
  );
  if (!matches.length || (!profile.concentration && strengths.size > 1))
    return profile;

  const exactStrength = profile.concentration
    ? matches.filter(
        (fragrance) =>
          concentrationKey(fragrance.concentration) ===
          concentrationKey(profile.concentration),
      )
    : [];
  const source = (exactStrength.length ? exactStrength : matches)[0];
  let supplemented = false;
  const take = <T>(
    current: T | null | undefined,
    value: T | null | undefined,
  ) => {
    if (current !== null && current !== undefined && current !== "")
      return current;
    if (value !== null && value !== undefined && value !== "") {
      supplemented = true;
      return value;
    }
    return current;
  };
  const stages = ["top", "heart", "base"] as const;
  const pyramid = Object.fromEntries(
    stages.map((stage) => {
      const current = profile.pyramid[stage];
      const value = current.length
        ? current
        : source.notes
            .filter((note) => note.stage === stage)
            .map((note) => note.name);
      if (!current.length && value.length) supplemented = true;
      return [stage, value];
    }),
  ) as LiveProfile["pyramid"];
  const notes = [
    ...new Set([
      ...profile.notes,
      ...source.notes
        .filter((note) => note.stage === "unclassified")
        .map((note) => note.name),
    ]),
  ];
  if (notes.length > profile.notes.length) supplemented = true;
  const seasons = profile.seasons.length
    ? profile.seasons
    : source.editorialSeasons;
  if (!profile.seasons.length && seasons.length) supplemented = true;
  const family =
    profile.family === "Not provided" ? source.family : profile.family;
  if (family !== profile.family) supplemented = true;
  const description =
    profile.description === "The source has not provided a scent description."
      ? source.description
      : profile.description;
  if (description !== profile.description) supplemented = true;

  return {
    ...profile,
    year: take(profile.year, source.year) ?? null,
    perfumer: take(profile.perfumer, source.perfumer) ?? null,
    concentration: take(profile.concentration, source.concentration) ?? null,
    family,
    description,
    pyramid,
    notes,
    seasons,
    ...(supplemented
      ? {
          supplementarySource: {
            name: source.sourceName,
            url: source.sourceUrl,
            checkedAt: source.checkedAt,
          },
        }
      : {}),
  };
}

export async function canonicalProductUrl(identity: {
  name: string;
  brand: string;
  concentration: string;
}): Promise<string | null> {
  const candidates = (await getOpenCatalog()).filter(
    (f) =>
      matchingCatalogEdition(identity, f) &&
      /^https:\/\/www\.scento\.com\/perfumes\/[a-z0-9-]+$/.test(f.sourceUrl),
  );
  const exact = candidates.filter(
    (f) => fragranceKey(f) === fragranceKey(identity),
  );
  const selected = exact.length ? exact : candidates;
  const urls = [...new Set(selected.map((f) => f.sourceUrl))];
  return urls.length === 1 ? urls[0] : null;
}
