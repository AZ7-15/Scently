import {
  criteriaSchema,
  normalize,
  type Criteria,
  type Fragrance,
  type Offer,
} from "./domain";
import { brandKey, identityName, concentrationKey } from "./catalog";
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
): Criteria {
  const c = criteriaSchema.parse(previous ?? {}),
    text = normalize(correctQuery(message));
  const vocabulary = [
    ...new Set(
      catalog.flatMap((f) => [
        ...f.notes.map((n) => normalize(n.name)),
        ...f.accords.map(normalize),
      ]),
    ),
  ];
  const named = vocabulary.filter((n) =>
    new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text),
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
  if (/masculine|\bmen\b/.test(text)) c.style = "masculine";
  if (/feminine|\bwomen\b/.test(text)) c.style = "feminine";
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
export function recommend(
  catalog: Fragrance[],
  criteria: Criteria,
  region = "CA",
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
  return catalog
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
      if (criteria.occasion)
        check(
          weights.season,
          f.occasions.includes(criteria.occasion),
          "Matches your occasion.",
          "No sourced occasion recommendation is available.",
        );
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
      if (criteria.style)
        check(
          weights.style,
          f.style === criteria.style,
          `A ${criteria.style} style preference match; anyone can wear it.`,
          "The catalog does not establish this style preference.",
        );
      if (
        criteria.niche &&
        !["Le Labo", "Diptyque", "Byredo"].includes(f.brand)
      )
        gaps.push("This brand is not in our curated niche selection.");
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
        b.score - a.score,
    )
    .slice(0, 5);
}
