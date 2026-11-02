import { getCatalog } from "./catalog";
import { getLiveFragrance, searchLiveFragrances } from "./scento";
import { searchCatalog, correctQuery } from "@/lib/discovery";
import { catalogFamily, brandKey, mergeFragrances } from "@/lib/catalog";
import {
  seasons,
  slugify,
  normalize,
  type Fragrance,
  type Note,
} from "@/lib/domain";

export async function searchUnifiedCatalog(
  query: string,
  continuation?: string,
) {
  const q = correctQuery(query.trim());
  const local = searchCatalog(await getCatalog(), { q });
  if (q.length < 2)
    return { results: local, continuation: null, providerTotal: 0, notice: "" };
  const remote = await searchLiveFragrances(q, continuation);
  // Only the current page is hydrated. No catalog crawling or background import.
  const records: Fragrance[] = [];
  for (let start = 0; start < remote.matches.length; start += 3) {
    const group = await Promise.all(
      remote.matches.slice(start, start + 3).map(async (item) => {
        const candidate = await getLiveFragrance(item.lookup).catch(() => null);
        const profile =
          candidate &&
          normalize(candidate.name) === normalize(item.name) &&
          brandKey(candidate.brand) === brandKey(item.brand)
            ? candidate
            : null;
        const concentration = profile?.concentration || "Not provided";
        const notes: Note[] = profile
          ? (["top", "heart", "base"] as const).flatMap((stage) =>
              profile.pyramid[stage].map((name) => ({ name, stage })),
            )
          : [];
        if (profile)
          for (const name of profile.notes)
            if (!notes.some((note) => normalize(note.name) === normalize(name)))
              notes.push({ name, stage: "unclassified" });
        const family = profile?.family || item.family;
        return {
          id:
            "scento-" +
            slugify(item.brand + "-" + item.name + "-" + concentration),
          slug: item.lookup,
          externalLookup: item.lookup,
          name: item.name,
          brand: item.brand,
          concentration,
          description:
            profile?.description ||
            "Open the source profile for available fragrance information.",
          year: profile?.year ?? null,
          perfumer: profile?.perfumer ?? null,
          style: "unknown",
          family: catalogFamily(family),
          color: "#b7a47d",
          shape: "round",
          imageUrl: null,
          accords: [family, profile?.subfamily].filter(
            (value): value is string => !!value && value !== "Not provided",
          ),
          notes,
          editorialSeasons: (profile?.seasons || [])
            .map((value) => (value === "autumn" ? "fall" : value))
            .filter((value): value is (typeof seasons)[number] =>
              (seasons as readonly string[]).includes(value),
            ),
          occasions: [],
          sourceUrl: profile?.sourceUrl || item.sourceUrl,
          sourceName: "Scento Perfume API",
          checkedAt: profile?.checkedAt || new Date().toISOString(),
          demo: false,
          rating: null,
          reviewCount: 0,
          longevity: null,
          projection: null,
          performanceVotes: 0,
          seasonVotes: {},
          offers: [],
        } satisfies Fragrance;
      }),
    );
    records.push(...group);
  }
  return {
    results: mergeFragrances(local, records),
    continuation: remote.continuation,
    providerTotal: remote.total,
    notice: "",
  };
}
