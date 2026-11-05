import { getOpenCatalog } from "./open-catalog";
import { browseSourceCatalog } from "./source-browse";
import { catalogSourceQuery } from "@/lib/catalog-filters";
import type { Filters } from "@/lib/discovery";
import { getCatalog, saveFragrance } from "./catalog";
import { databaseConfigured } from "./configuration";
import { getLiveFragrance, searchLiveFragrances } from "./scento";
import { searchCatalog, correctQuery } from "@/lib/discovery";
import {
  catalogFamily,
  matchingCatalogEdition,
  sameFragrance,
  mergeFragrances,
} from "@/lib/catalog";
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
  filters: Filters = {},
) {
  const q = correctQuery(query.trim());
  const criteria = { ...filters, q };
  const newest = filters.sort === "newest";
  const [saved, open] = await Promise.all([
    getCatalog(),
    newest ? Promise.resolve([]) : getOpenCatalog(),
  ]);
  const local = newest ? [] : searchCatalog(saved, criteria);
  const indexed = searchCatalog(open, criteria);
  const sourceQuery = catalogSourceQuery(criteria);
  if (!q || newest) {
    try {
      const source = await browseSourceCatalog(criteria, continuation);
      if (databaseConfigured()) {
        const sourceProfiles = source.results.filter(
          (candidate) =>
            !saved.some((existing) =>
              matchingCatalogEdition(existing, candidate),
            ),
        );
        for (let start = 0; start < sourceProfiles.length; start += 3)
          await Promise.all(
            sourceProfiles.slice(start, start + 3).map((candidate) =>
              saveFragrance(candidate, false).catch(() => undefined),
            ),
          );
      }
      return {
        ...source,
        notice:
          indexed.length && source.notice
            ? "Showing the published database; live storefront coverage may differ."
            : source.notice,
        results: searchCatalog(
          mergeFragrances(local, [...source.results, ...indexed]),
          criteria,
        ),
      };
    } catch (e) {
      if (!indexed.length) throw e;
      return {
        results: searchCatalog(mergeFragrances(local, indexed), criteria),
        continuation: null,
        providerTotal: 0,
        notice:
          "Live listings are temporarily unavailable. Showing the attributed published index.",
      };
    }
  }
  let liveSourceUnavailable = false;
  const remote = await searchLiveFragrances(sourceQuery, continuation).catch(
    () => {
      liveSourceUnavailable = true;
      return { matches: [], continuation: null, total: 0 };
    },
  );
  // Only the current page is hydrated. No catalog crawling or background import.
  const records: Fragrance[] = [];
  for (let start = 0; start < remote.matches.length; start += 3) {
    const group = await Promise.all(
      remote.matches.slice(start, start + 3).map(async (item) => {
        const candidate = await getLiveFragrance(item.lookup).catch(() => null);
        const profile =
          candidate && sameFragrance(item, candidate) ? candidate : null;
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
    results: searchCatalog(
      mergeFragrances(local, [...searchCatalog(records, criteria), ...indexed]),
      criteria,
    ),
    continuation: remote.continuation,
    providerTotal: remote.total,
    notice: liveSourceUnavailable
      ? "The live fragrance source is unavailable. Showing matching fragrances from the published catalog."
      : q.length > 0 && searchCatalog(records, { q }).length < records.length
        ? "Unrelated source suggestions were excluded. The source may not contain the fragrance you searched for."
        : "",
  };
}
