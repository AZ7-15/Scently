import { describe, it, expect } from "vitest";
import { curatedCatalog as catalog } from "../data/catalog";
import {
  criteriaSchema,
  offerSchema,
  reviewSchema,
  type Offer,
} from "../lib/domain";
import {
  searchCatalog,
  parseCriteria,
  recommend,
  isCurrentOffer,
  sortedOffers,
} from "../lib/discovery";
import { prepareImport, parseCsv } from "../lib/importer";
const offer: Offer = {
  id: "test-offer",
  fragranceId: catalog[0].id,
  retailer: "Test retailer",
  size: 100,
  concentration: "Eau de Parfum",
  packaging: "retail",
  condition: "new",
  price: 70,
  currency: "CAD",
  region: "CA",
  shipping: 10,
  tax: 10,
  inStock: true,
  verifiedAt: new Date().toISOString(),
  url: "https://example.com/product",
  affiliateUrl: null,
  source: "Test fixture only",
};
describe("Discovery", () => {
  it("finds known names, partial brands, notes and corrected spelling", () => {
    expect(searchCatalog(catalog, { q: "Dior Sauvage" })[0].id).toBe(
      "sauvage-edp",
    );
    expect(searchCatalog(catalog, { q: "vanila" }).length).toBeGreaterThan(1);
    expect(searchCatalog(catalog, { q: "Margi" })[0].id).toBe("jazz-club");
  });
  it("combines note and season filters", () => {
    const rows = searchCatalog(catalog, {
      notes: ["Vanilla"],
      seasons: ["winter"],
      family: "dark",
    });
    expect(rows.map((f) => f.id)).toEqual(["jazz-club"]);
  });
  it("does not invent ratings or performance", () => {
    expect(searchCatalog(catalog, { minHours: 6 })).toHaveLength(0);
    expect(searchCatalog(catalog, { minRating: 4 })).toHaveLength(0);
    expect(
      catalog.every((f) => !f.rating && !f.offers.length && !f.reviewCount),
    ).toBe(true);
  });
  it("parses preferences and refines a conversation", () => {
    const c = parseCriteria(
      "masculine vanilla fragrance lasting 6–8 hours with strong projection",
      catalog,
    );
    expect(c).toMatchObject({
      notes: ["vanilla"],
      style: "masculine",
      minHours: 6,
      maxHours: 8,
      projection: "strong",
    });
    const next = parseCriteria(
      "Only winter fragrances. Make it cheaper.",
      catalog,
      c,
    );
    expect(next.notes).toContain("vanilla");
    expect(next.season).toBe("winter");
    expect(next.budget).toBe(100);
    expect(c.budget).toBeNull();
  });
  it("returns only catalog records and discloses missing performance", () => {
    const matches = recommend(
      catalog,
      parseCriteria("masculine vanilla 6–8 hours strong projection", catalog),
    );
    expect(
      matches.every((m) => catalog.some((f) => f.id === m.fragrance.id)),
    ).toBe(true);
    expect(matches.every((m) => !m.exact)).toBe(true);
    expect(matches[0].gaps.some((g) => g.includes("Longevity"))).toBe(true);
  });
  it("never treats unknown notes as an exact match", () => {
    const c = parseCriteria("A fragrance with unobtainium", catalog);
    expect(c.notes).toContain("unobtainium");
    expect(recommend(catalog, c).every((m) => !m.exact)).toBe(true);
  });
  it("excludes unwanted notes", () => {
    const c = parseCriteria("without vanilla", catalog);
    expect(c.excludeNotes).toContain("vanilla");
    expect(
      recommend(catalog, c).every(
        (m) => !m.fragrance.notes.some((n) => n.name === "Vanilla"),
      ),
    ).toBe(true);
  });
  it("respects hard budgets including tax and shipping", () => {
    const c = criteriaSchema.parse({ budget: 100, hardBudget: true });
    const withOffers = catalog.map((f, i) => ({
      ...f,
      offers: i === 0 ? [offer] : [{ ...offer, fragranceId: f.id, price: 110 }],
    }));
    expect(
      recommend(withOffers, c)
        .filter((m) => m.exact)
        .map((m) => m.fragrance.id),
    ).toEqual([catalog[0].id]);
    expect(
      recommend([{ ...catalog[0], offers: [{ ...offer, tax: null }] }], c)[0]
        .exact,
    ).toBe(false);
  });
  it("does not treat absent budget evidence as a match", () => {
    expect(
      recommend(
        catalog,
        criteriaSchema.parse({ budget: 100, hardBudget: true }),
      ).every((m) => !m.exact),
    ).toBe(true);
  });
});
describe("Offers", () => {
  it("rejects expired, future, wrong currency, region and out-of-stock listings", () => {
    expect(isCurrentOffer(offer)).toBe(true);
    for (const o of [
      { ...offer, verifiedAt: "2020-01-01T00:00:00Z" },
      { ...offer, verifiedAt: "2099-01-01T00:00:00Z" },
      { ...offer, currency: "USD" as const },
      { ...offer, region: "US" as const },
      { ...offer, inStock: false },
    ])
      expect(isCurrentOffer(o)).toBe(false);
  });
  it("sorts known shipping and equivalent sizes", () => {
    expect(
      sortedOffers(
        [
          offer,
          { ...offer, id: "unknown", price: 1, shipping: null },
          { ...offer, id: "smaller", size: 50, price: 40 },
        ],
        "CA",
        100,
      ).map((o) => o.id),
    ).toEqual(["test-offer", "unknown"]);
  });
  it("validates unsafe links and future verification dates", () => {
    expect(
      offerSchema.safeParse({ ...offer, url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      offerSchema.safeParse({ ...offer, verifiedAt: "2099-01-01T00:00:00Z" })
        .success,
    ).toBe(false);
  });
});
describe("Content validation and imports", () => {
  it("rejects invalid review values", () => {
    expect(
      reviewSchema.safeParse({
        fragranceId: "x",
        rating: 6,
        content: "This is a sufficiently long review.",
      }).success,
    ).toBe(false);
    expect(
      reviewSchema.safeParse({ fragranceId: "x", rating: 5, content: "Tiny" })
        .success,
    ).toBe(false);
  });
  it("parses quoted CSV including escaped quotes and newlines", () => {
    expect(parseCsv('name,description\n"A, B","line 1\nline ""2"""')).toEqual([
      { name: "A, B", description: 'line 1\nline "2"' },
    ]);
  });
  it("detects duplicates without overwriting", () => {
    const r = prepareImport(JSON.stringify([catalog[0], catalog[0]]), "json");
    expect(r.records).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
  });
  it("rejects malformed sources and CSV", () => {
    expect(
      prepareImport(
        JSON.stringify([{ ...catalog[0], sourceUrl: "invalid" }]),
        "json",
      ).errors,
    ).toHaveLength(1);
    expect(() => parseCsv('name\n"unfinished')).toThrow();
  });
});
