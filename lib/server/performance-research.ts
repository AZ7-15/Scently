import data from "@/data/performance-research.json";
import { fragranceKey, matchingCatalogEdition } from "@/lib/catalog";
import type { WearEvidence } from "@/lib/wear-evidence";
import { z } from "zod";
const schema = z.array(
  z.object({
    name: z.string(),
    brand: z.string(),
    concentration: z.string(),
    sourceUrl: z.string().url(),
    checkedAt: z.string(),
    longevity: z.number().int().min(1).max(5).nullable(),
    projection: z.number().int().min(1).max(5).nullable(),
  }),
);
const records = schema.parse(data);
const lengthLabels = [
  "",
  "Short",
  "Below average",
  "Moderate",
  "Long-lasting",
  "Very long-lasting",
];
const projectionLabels = [
  "",
  "Skin scent",
  "Soft",
  "Moderate",
  "Strong",
  "Room-filling",
];
export function researchedPerformance(f: {
  name: string;
  brand: string;
  concentration: string | null;
}): WearEvidence[] {
  const identity = { ...f, concentration: f.concentration || "" };
  const candidates = records.filter((r) => matchingCatalogEdition(identity, r));
  const exact = candidates.filter(
    (r) => fragranceKey(identity) === fragranceKey(r),
  );
  const matches = exact.length ? exact : candidates;
  // Do not transfer a rating between ambiguous concentration editions.
  if (new Set(matches.map(fragranceKey)).size !== 1) return [];
  const r = matches[0];
  if (!r) return [];
  return [
    {
      source: "10ML Fragrance Index",
      sourceUrl: r.sourceUrl,
      checkedAt: r.checkedAt,
      kind: "editorial",
      longevity: r.longevity ? lengthLabels[r.longevity] : null,
      projection: r.projection ? projectionLabels[r.projection] : null,
      ...(r.longevity ? { longevityScore: r.longevity } : {}),
      ...(r.projection ? { projectionScore: r.projection } : {}),
    },
  ];
}
