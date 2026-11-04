import {
  criteriaSchema,
  normalize,
  type Criteria,
  type Fragrance,
  type Offer,
} from "./domain";
import { brandKey, identityName, concentrationKey } from "./catalog";
import { comparePopularity } from "./popularity";
export const OFFER_TTL_HOURS = 48;
export function isCurrentOffer(o: Offer, region = "CA", now = Date.now()) {
  const age = now - new Date(o.verifiedAt).getTime();
  return (
    o.inStock &&
    o.region === region &&
    o.currency === (region === "CA" ? "CAD" : "USD") &&
    age >= 0 &&
    age <= OFFER_TTL_HOURS * 3600000
  );
}
export const offerTotal = (o: Offer) =>
  o.price + (o.shipping ?? 0) + (o.tax ?? 0);
export function sortedOffers(offers: Offer[], region = "CA", size?: number) {
  return offers
    .filter((o) => isCurrentOffer(o, region) && (!size || o.size === size))
    .sort(
      (a, b) =>
        Number(a.shipping === null || a.tax === null) -
          Number(b.shipping === null || b.tax === null) ||
        offerTotal(a) - offerTotal(b),
    );
}
export function correctQuery(q: string) {
  return q
    .replace(/\bvanila\b/gi, "vanilla")
    .replace(/\bsavage\b/gi, "sauvage")
    .replace(/\bsandelwood\b/gi, "sandalwood");
}
export interface Filters {
  q?: string;
  notes?: string[];
  seasons?: string[];
  family?: string;
  budget?: number;
  minHours?: number;
  projection?: string;
  brand?: string;
  concentration?: string;
  style?: string;
  minRating?: number;
  occasion?: string;
  region?: string;
  sort?: string;
  niche?: boolean;
}
export function searchCatalog(catalog: Fragrance[], filters: Filters) {
  const q = identityName(correctQuery(filters.q || "")).replace(
    /(\d)\s+([a-z])/g,
    "$1$2",
  );
  const terms = q
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (t) =>
        ![
          "fragrance",
          "fragrances",
          "best",
          "for",
          "with",
          "perfume",
          "perfumes",
        ].includes(t),
    );
  const result = catalog.filter((f) => {
    const words = identityName(
      [
        f.name,
        f.brand,
        f.concentration,
        f.style,
        f.family,
        ...f.accords,
        ...f.notes.map((n) => n.name),
        ...f.editorialSeasons,
        ...f.occasions,
      ].join(" "),
    ).replace(/(\d)\s+([a-z])/g, "$1$2");
    return (
      terms.every((t) => words.includes(t)) &&
      (!filters.family || f.family === filters.family) &&
      (!filters.notes?.length ||
        filters.notes.every((n) => words.includes(normalize(n)))) &&
      (!filters.seasons?.length ||
        filters.seasons.some((s) => f.editorialSeasons.includes(s as never))) &&
      (!filters.budget ||
        f.offers.some(
          (o) =>
            isCurrentOffer(o, filters.region) &&
            o.shipping !== null &&
            o.tax !== null &&
            offerTotal(o) <= filters.budget!,
        )) &&
      (!filters.minHours ||
        (f.longevity !== null && f.longevity >= filters.minHours)) &&
      (!filters.projection || f.projection === filters.projection) &&
      (!filters.brand || brandKey(f.brand) === brandKey(filters.brand)) &&
      (!filters.concentration ||
        (concentrationKey(f.concentration) || f.concentration) ===
          (concentrationKey(filters.concentration) || filters.concentration)) &&
      (!filters.style || f.style === filters.style) &&
      (!filters.occasion || f.occasions.includes(filters.occasion)) &&
      (!filters.minRating ||
        (f.rating !== null && f.rating >= filters.minRating))
    );
  });
  if (filters.sort === "rating")
    result.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  if (filters.sort === "name")
    result.sort((a, b) => a.name.localeCompare(b.name));
  if (!filters.sort || filters.sort === "popular")
    result.sort(comparePopularity);
  return result;
}
export const weights = {
  notes: 30,
  longevity: 20,
  projection: 20,
  season: 10,
  budget: 10,
  style: 10,
};
export function parseCriteria(
  message: string,
  catalog: Fragrance[],
  previous?: Criteria,
  sourceVocabulary: string[] = [],
): Criteria {
  const c = criteriaSchema.parse(previous ?? {}),
    text = normalize(correctQuery(message));
  const vocabulary = [
    ...new Set([
      ...sourceVocabulary.map(normalize),
      ...catalog.flatMap((f) => [
        ...f.notes.map((n) => normalize(n.name)),
        ...f.accords.map(normalize),
      ]),
    ]),
  ];
  const named = vocabulary
    .filter((n) =>
      new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
        text,
      ),
    )
    .filter(
      (n, _, all) => !all.some((longer) => longer !== n && longer.includes(n)),
    );
  const similar = catalog.find(
    (f) =>
      text.includes(normalize(f.name)) && /like|similar|cheaper/.test(text),
  );
  if (similar) named.push(...similar.accords.map(normalize));
  const unknown = text.match(
    /(?:with|containing|must have)\s+([a-z]+)(?:\s+(?:notes?|fragrance))?(?:[.!?]|$)/,
  );
  if (
    unknown &&
    !vocabulary.includes(unknown[1]) &&
    !["projection", "performance"].includes(unknown[1])
  )
    named.push(unknown[1]);
  const exclude = named.filter((n) =>
    new RegExp(
      `(?:no|without|avoid|less)\\s+${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    ).test(text),
  );
  c.excludeNotes = [...new Set([...c.excludeNotes, ...exclude])];
  if (named.length)
    c.notes = [
      ...new Set([...c.notes, ...named.filter((n) => !exclude.includes(n))]),
    ].filter((n) => !c.excludeNotes.includes(n));
  if (/less sweet/.test(text))
    c.excludeNotes = [...new Set([...c.excludeNotes, "sweet"])];
  for (const s of ["spring", "summer", "fall", "winter"] as const)
    if (text.includes(s)) c.season = s;
  if (text.includes("autumn")) c.season = "fall";
  if (/masculine|\b(men|mens|male|man|him)\b|for him/.test(text))
    c.style = "masculine";
  if (/feminine|\b(women|womens|female|woman|her)\b|for her/.test(text))
    c.style = "feminine";
  if (/unisex|any gender/.test(text)) c.style = null;
  if (text.includes("very strong")) c.projection = "very strong";
  else if (text.includes("strong projection")) c.projection = "strong";
  else if (/intimate|close to skin/.test(text)) c.projection = "intimate";
  else if (text.includes("moderate projection")) c.projection = "moderate";
  const hours = text.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:hours?|hrs?)/);
  if (hours) {
    c.minHours = Number(hours[1]);
    c.maxHours = Number(hours[2]);
  } else {
    const h = text.match(/(?:at least\s*)?(\d+)\s*(?:hours?|hrs?)/);
    if (h) c.minHours = Number(h[1]);
    else if (text.includes("long-lasting")) c.minHours = 8;
  }
  const budget = text.match(
    /(?:under|below|less than|budget(?: of)?|up to|max(?:imum)?)\s*\$?\s*(\d+)/,
  );
  if (budget) {
    c.budget = Number(budget[1]);
    c.hardBudget = true;
  }
  if (text.includes("cheaper")) {
    c.budget = c.budget ? Math.round(c.budget * 0.8) : 100;
    c.hardBudget = true;
  }
  if (/must|only|need/.test(text) && named.length) c.hardNotes = true;
  if (text.includes("niche")) c.niche = true;
  if (
    /\b(new arrivals|latest|newest|recent releases|new releases)\b/.test(text)
  )
    c.newArrivals = true;
  if (/\b(all editions|all releases|any release|include older)\b/.test(text))
    c.newArrivals = false;
  if (text.includes("longest")) c.sortLongevity = true;
  for (const occasion of [
    "school",
    "office",
    "date night",
    "formal",
    "daily wear",
  ])
    if (text.includes(occasion)) c.occasion = occasion;
  return criteriaSchema.parse(c);
}
export interface Match {
  fragrance: Fragrance;
  score: number;
  reasons: string[];
  gaps: string[];
  exact: boolean;
}
export interface RecommendationSignal {
  rank: number;
  gender: "men" | "women" | "unisex" | null;
  occasions: string[];
  styles: string[];
}
export function recommend(
  catalog: Fragrance[],
  criteria: Criteria,
  region = "CA",
  signals: Map<string, RecommendationSignal> = new Map(),
): Match[] {
  if (
    criteria.notes.length &&
    !catalog.some((f) =>
      criteria.notes.some((n) =>
        normalize(
          [...f.accords, ...f.notes.map((note) => note.name)].join(" "),
        ).includes(normalize(n)),
      ),
    )
  )
    return [];
  const audienceTier = (fragrance: Fragrance) => {
    const gender = signals.get(fragrance.id)?.gender;
    if (criteria.style === "masculine")
      return fragrance.style === "masculine" || gender === "men" ? 0 : 1;
    if (criteria.style === "feminine")
      return fragrance.style === "feminine" || gender === "women" ? 0 : 1;
    return 0;
  };
  return catalog
    .filter((f) => {
      if (criteria.style === "masculine")
        return (
          signals.get(f.id)?.gender !== "women" &&
          f.style !== "feminine" &&
          (f.style === "masculine" ||
            f.style === "all" ||
            ["men", "unisex"].includes(signals.get(f.id)?.gender || ""))
        );
      if (criteria.style === "feminine")
        return (
          signals.get(f.id)?.gender !== "men" &&
          f.style !== "masculine" &&
          (f.style === "feminine" ||
            f.style === "all" ||
            ["women", "unisex"].includes(signals.get(f.id)?.gender || ""))
        );
      return true;
    })
    .map((f) => {
      let earned = 0,
        possible = 0;
      const reasons: string[] = [],
        gaps: string[] = [];
      const words = normalize(
        [...f.notes.map((n) => n.name), ...f.accords].join(" "),
      );
      const check = (weight: number, ok: boolean, yes: string, no: string) => {
        possible += weight;
        if (ok) {
          earned += weight;
          reasons.push(yes);
        } else gaps.push(no);
      };
      if (criteria.newArrivals)
        check(
          weights.style,
          f.isNewArrival === true,
          "Listed in the live source new-arrivals feed.",
          "Not established as a current source arrival.",
        );
      if (criteria.notes.length)
        check(
          weights.notes,
          criteria.notes.every((n) => words.includes(normalize(n))),
          `Includes ${criteria.notes.filter((n) => words.includes(normalize(n))).join(", ")}.`,
          `Does not list all requested notes: ${criteria.notes.filter((n) => !words.includes(normalize(n))).join(", ")}.`,
        );
      if (criteria.excludeNotes.some((n) => words.includes(normalize(n))))
        gaps.push("Includes a note or accord you asked to avoid.");
      if (criteria.minHours !== null || criteria.maxHours !== null)
        check(
          weights.longevity,
          f.longevity !== null &&
            f.longevity >= (criteria.minHours ?? 0) &&
            f.longevity <= (criteria.maxHours ?? 48),
          "Community longevity fits your range.",
          f.longevity === null
            ? "Longevity has not been established by community reviews."
            : "Reported longevity is outside your range.",
        );
      if (criteria.projection)
        check(
          weights.projection,
          f.projection === criteria.projection,
          "Community projection matches.",
          f.projection === null
            ? "Projection has not been established by community reviews."
            : "Reported projection differs from your preference.",
        );
      if (criteria.season)
        check(
          weights.season,
          f.editorialSeasons.includes(criteria.season),
          `Editorial pick for ${criteria.season}; not a community consensus.`,
          `Not an editorial pick for ${criteria.season}.`,
        );
      if (criteria.occasion) {
        const editorOccasion = signals
          .get(f.id)
          ?.occasions.some(
            (occasion) =>
              identityName(occasion) === identityName(criteria.occasion!),
          );
        check(
          weights.season,
          f.occasions.some(
            (occasion) =>
              identityName(occasion) === identityName(criteria.occasion!),
          ) || !!editorOccasion,
          editorOccasion
            ? `10ML Fragrance Index editors list it for ${criteria.occasion}.`
            : "Matches your occasion.",
          "No sourced occasion recommendation is available.",
        );
      }
      if (criteria.budget)
        check(
          weights.budget,
          f.offers.some(
            (o) =>
              isCurrentOffer(o, region) &&
              o.shipping !== null &&
              o.tax !== null &&
              offerTotal(o) <= criteria.budget!,
          ),
          `Verified total within ${region === "CA" ? "CAD" : "USD"} ${criteria.budget}.`,
          "No current verified total including shipping and tax meets your budget.",
        );
      if (criteria.brand)
        check(
          weights.style,
          brandKey(f.brand) === brandKey(criteria.brand),
          `From ${f.brand}.`,
          `Not from ${criteria.brand}.`,
        );
      if (criteria.style) {
        const editorAudience = signals.get(f.id)?.gender;
        const editorMatch =
          (criteria.style === "masculine" &&
            ["men", "unisex"].includes(editorAudience || "")) ||
          (criteria.style === "feminine" &&
            ["women", "unisex"].includes(editorAudience || ""));
        check(
          weights.style,
          f.style === criteria.style || f.style === "all" || editorMatch,
          editorMatch
            ? `10ML Fragrance Index lists it as marketed for ${editorAudience === "unisex" ? "all genders" : editorAudience}.`
            : `A ${criteria.style} fragrance match; anyone can wear it.`,
          "The catalog does not establish this style preference.",
        );
      }
      const signal = signals.get(f.id);
      if (signal)
        reasons.push(
          "Included in the 10ML Fragrance Index editorial results for your description.",
        );
      if (signal?.styles.some((style) => identityName(style) === "sensual"))
        reasons.push(
          "10ML Fragrance Index editors describe its style as sensual.",
        );
      if (criteria.niche && f.niche !== true)
        gaps.push(
          "The source does not establish a niche classification for this brand.",
        );
      return {
        fragrance: f,
        score: possible ? earned / possible : 0,
        reasons,
        gaps,
        exact: gaps.length === 0,
      };
    })
    .filter(
      (m) =>
        !criteria.excludeNotes.some((n) =>
          normalize(
            [
              ...m.fragrance.accords,
              ...m.fragrance.notes.map((n) => n.name),
            ].join(" "),
          ).includes(normalize(n)),
        ),
    )
    .sort(
      (a, b) =>
        Number(b.exact) - Number(a.exact) ||
        (criteria.sortLongevity
          ? (b.fragrance.longevity ?? -1) - (a.fragrance.longevity ?? -1)
          : 0) ||
        b.score - a.score ||
        (signals.get(a.fragrance.id)?.rank ?? Number.POSITIVE_INFINITY) -
          (signals.get(b.fragrance.id)?.rank ?? Number.POSITIVE_INFINITY) ||
        audienceTier(a.fragrance) - audienceTier(b.fragrance) ||
        comparePopularity(a.fragrance, b.fragrance),
    )
    .slice(0, 5);
}
