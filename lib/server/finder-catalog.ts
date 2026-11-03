import { getOpenCatalog } from "./open-catalog";
import { searchCatalog } from "@/lib/discovery";
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
  const [facets, open] = await Promise.all([sourceFacets(), getOpenCatalog()]);
  const referenceText = message.match(
    /(?:similar to|like)\s+(.+?)(?=\s+(?:but|with|under|for)\b|[.!?]|$)/i,
  )?.[1];
  let reference: Fragrance[] = [];
  if (referenceText && referenceText.length >= 2 && referenceText.length <= 150)
    reference = (await searchUnifiedCatalog(referenceText)).results.slice(0, 1);
  const vocabulary = [
    ...(facets.vocabulary || facets.notes.map((n) => n.name)),
    ...open.flatMap((f) => f.notes.map((n) => n.name)),
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
  const namedBrand = [
    ...new Map(
      [...facets.brands.map((b) => b.name), ...open.map((f) => f.brand)].map(
        (name) => [brandKey(name), { name }],
      ),
    ).values(),
  ]
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
  const [facets, open] = await Promise.all([sourceFacets(), getOpenCatalog()]);
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
    sort: criteria.newArrivals ? "newest" : undefined,
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
  const source =
    continuation === "index"
      ? {
          results: [] as Fragrance[],
          continuation: null,
          providerTotal: 0,
          notice: "Searching the published catalog index.",
        }
      : unknown && !criteria.newArrivals
        ? await searchUnifiedCatalog(
            unknown,
            continuation?.replace(/^search:/, ""),
          )
        : await browseSourceCatalog(filters, continuation, {
            candidates: true,
          });
  if (unknown && !criteria.newArrivals && source.continuation)
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
  const indexed = searchCatalog(criteria.newArrivals ? [] : open, {
    brand: criteria.brand || undefined,
    notes: criteria.notes,
  }).map((f) => ({
    ...f,
    niche:
      facets.brands.find((b) => brandKey(b.name) === brandKey(f.brand))
        ?.isNiche ?? null,
  }));
  const sourceKeys = new Set(sourceRecords.map(fragranceKey));
  const excluded = new Set(seen);
  const catalog = mergeFragrances(classified, [...sourceRecords, ...indexed])
    .filter(
      (f) =>
        !excluded.has(f.id) &&
        (!criteria.newArrivals || sourceKeys.has(fragranceKey(f))) &&
        (!criteria.brand || brandKey(f.brand) === brandKey(criteria.brand)),
    )
    .map((f) => ({
      ...f,
      isNewArrival:
        criteria.newArrivals && sourceKeys.has(fragranceKey(f))
          ? true
          : f.isNewArrival,
    }))
    .sort(
      (a, b) =>
        Number(sourceKeys.has(fragranceKey(b))) -
        Number(sourceKeys.has(fragranceKey(a))),
    );
  return {
    catalog,
    continuation:
      source.continuation ||
      (indexed.length && catalog.length > 5 ? "index" : null),
    coverage: {
      scope: "source-catalog",
      assessed: catalog.length,
      sourceCandidates: source.results.length,
      totalCandidates: source.providerTotal,
      indexedCandidates: indexed.length,
    },
    notice: source.notice,
  };
}
