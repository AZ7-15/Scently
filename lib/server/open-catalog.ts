import { z } from "zod";
import bundled from "@/data/scento-open-catalog.json";
import { catalogFamily, concentrationKey } from "@/lib/catalog";
import { seasons, type Fragrance, type Note } from "@/lib/domain";
import type { LiveProfile } from "@/lib/live-catalog";
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
  return rowsSchema.parse(rows).map((r: Row) => {
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
