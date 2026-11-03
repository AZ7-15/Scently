import type { Criteria, Fragrance } from "@/lib/domain";
import {
  identityName,
  brandKey,
  mergeFragrances,
  fragranceKey,
} from "@/lib/catalog";
import { browseSourceCatalog, sourceFacets } from "./source-browse";
import { searchUnifiedCatalog } from "./unified-catalog";
import { parseCriteria, type Filters } from "@/lib/discovery";
export async function interpretCatalogCriteria(
  message: string,
  local: Fragrance[],
  previous?: Criteria,
) {
  const facets = await sourceFacets();
  const referenceText = message.match(
    /(?:similar to|like)\s+(.+?)(?=\s+(?:but|with|under|for)\b|[.!?]|$)/i,
  )?.[1];
  let reference: Fragrance[] = [];
  if (referenceText && referenceText.length >= 2 && referenceText.length <= 150)
    reference = (await searchUnifiedCatalog(referenceText)).results.slice(0, 1);
  const vocabulary = [
    ...(facets.vocabulary || facets.notes.map((n) => n.name)),
    "sweet",
    "fresh",
    "woody",
    "floral",
    "amber",
    "spicy",
    "citrus",
    "aromatic",
    "fruity",
    "leather",
  ];
  const criteria = parseCriteria(
    message,
    mergeFragrances(local, reference),
    previous,
    vocabulary,
  );
  const text = identityName(message);
  const namedBrand = facets.brands
    .slice()
    .sort((a, b) => b.name.length - a.name.length)
    .find((b) => {
      const name = identityName(b.name);
      return referenceText
        ? (" " + text + " ").includes(" from " + name + " ")
        : (" " + text + " ").includes(" " + name + " ");
    });
  if (namedBrand) criteria.brand = namedBrand.name;
  if (/\b(any|all) (brands|brand|houses|house)\b/.test(text))
    criteria.brand = null;
  return criteria;
}
export async function finderCandidates(
  criteria: Criteria,
  local: Fragrance[],
  continuation?: string,
  seen: string[] = [],
) {
  const facets = await sourceFacets();
  const notes = criteria.notes.filter((note) =>
    facets.notes.some((n) => identityName(n.name) === identityName(note)),
  );
  const family = criteria.notes
    .map(identityName)
    .find((n) => ["woody", "floral", "fresh"].includes(n));
  const filters: Filters = {
    brand: criteria.brand || undefined,
    notes,
    style: criteria.style || undefined,
    niche: criteria.niche,
    family,
  };
  const unknown = criteria.notes.find(
    (n) =>
      !facets.notes.some((m) => identityName(m.name) === identityName(n)) &&
      ![
        "sweet",
        "fresh",
        "woody",
        "floral",
        "amber",
        "spicy",
        "citrus",
        "aromatic",
        "fruity",
        "leather",
      ].includes(identityName(n)),
  );
  const source = unknown
    ? await searchUnifiedCatalog(unknown, continuation?.replace(/^search:/, ""))
    : await browseSourceCatalog(filters, continuation, { candidates: true });
  if (unknown && source.continuation)
    source.continuation = "search:" + source.continuation;
  const classified = local.map((f) => ({
    ...f,
    niche:
      facets.brands.find((b) => brandKey(b.name) === brandKey(f.brand))
        ?.isNiche ??
      f.niche ??
      null,
  }));
  const sourceRecords = source.results.map((f) => ({
    ...f,
    niche:
      f.niche ??
      facets.brands.find((b) => brandKey(b.name) === brandKey(f.brand))
        ?.isNiche ??
      null,
  }));
  const sourceKeys = new Set(sourceRecords.map(fragranceKey));
  const excluded = new Set(seen);
  const catalog = mergeFragrances(classified, sourceRecords)
    .filter(
      (f) =>
        !excluded.has(f.id) &&
        (!criteria.brand || brandKey(f.brand) === brandKey(criteria.brand)),
    )
    .sort(
      (a, b) =>
        Number(sourceKeys.has(fragranceKey(b))) -
        Number(sourceKeys.has(fragranceKey(a))),
    );
  return {
    catalog,
    continuation: source.continuation,
    coverage: {
      scope: "source-catalog",
      assessed: catalog.length,
      sourceCandidates: source.results.length,
      totalCandidates: source.providerTotal,
    },
    notice: source.notice,
  };
}
