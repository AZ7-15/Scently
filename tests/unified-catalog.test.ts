import { expect, it } from "vitest";
import { mergeFragrances } from "../lib/catalog";
import { curatedCatalog } from "../data/catalog";
import { searchCatalog } from "../lib/discovery";
it("merges matching source records while preserving concentration variants and local reviews", () => {
  const local = { ...curatedCatalog[0], rating: 4.5, reviewCount: 8 };
  const same = {
    ...local,
    id: "remote",
    brand: "Christian Dior",
    rating: null,
    reviewCount: 0,
  };
  const variant = { ...same, id: "toilette", concentration: "Eau de Toilette" };
  const merged = mergeFragrances([local], [same, variant]);
  expect(merged).toHaveLength(2);
  expect(merged[0].reviewCount).toBe(8);
  expect(merged[1].concentration).toBe("Eau de Toilette");
});
it("uses the same filters for source records and local entries without guessing missing performance", () => {
  const source = {
    ...curatedCatalog[2],
    id: "source",
    externalLookup: "source",
    longevity: null,
    brand: "Lattafa",
  };
  const results = searchCatalog([curatedCatalog[0], source], {
    notes: ["Vanilla"],
    seasons: ["winter"],
    brand: "Lattafa Perfumes",
  });
  expect(results.map((record) => record.id)).toEqual(["source"]);
  expect(searchCatalog(results, { minHours: 8 })).toEqual([]);
});

it("keeps identity in external profile links and validates variants across brands", async () => {
  const { sameFragrance } = await import("../lib/catalog");
  const { fragrancePath } = await import("../lib/domain");
  for (const [name, brand] of [
    ["Sauvage", "Dior"],
    ["Bleu de Chanel", "Chanel"],
    ["9PM", "Afnan"],
    ["Layton", "Parfums de Marly"],
  ]) {
    const expected = { name, brand, concentration: "Eau de Parfum" };
    expect(sameFragrance(expected, { ...expected, concentration: "EDP" })).toBe(
      true,
    );
    expect(sameFragrance(expected, { ...expected, concentration: "EDT" })).toBe(
      false,
    );
    expect(sameFragrance(expected, { ...expected, concentration: null })).toBe(
      false,
    );
    expect(
      sameFragrance(expected, { ...expected, name: name + " Rebel" }),
    ).toBe(false);
    const url = new URL(
      fragrancePath({
        ...curatedCatalog[0],
        ...expected,
        externalLookup: "lookup",
      }),
      "https://example.com",
    );
    expect(url.searchParams.get("name")).toBe(name);
    expect(url.searchParams.get("concentration")).toBe("Eau de Parfum");
  }
});

it("excludes unrelated provider suggestions and normalizes spaced model numbers", () => {
  const items = [
    { ...curatedCatalog[0], name: "Layton", brand: "Parfums de Marly" },
    { ...curatedCatalog[0], name: "9 PM", brand: "Afnan" },
  ];
  expect(searchCatalog(items, { q: "Bleu de Chanel" })).toEqual([]);
  expect(searchCatalog(items, { q: "Afnan 9PM" }).map((f) => f.name)).toEqual([
    "9 PM",
  ]);
});

it("removes unspecified duplicates regardless of source order, retaining real concentration variants", () => {
  const base = { ...curatedCatalog[0], name: "Sauvage" };
  const unknown = { ...base, id: "unknown", concentration: "Not provided" };
  const edt = { ...base, id: "edt", concentration: "EDT" };
  for (const items of [
    [unknown, base, edt],
    [base, edt, unknown],
    [edt, unknown, base],
  ]) {
    const merged = mergeFragrances([], items);
    expect(merged).toHaveLength(2);
    expect(merged.map((f) => f.id)).not.toContain("unknown");
  }
  expect(
    mergeFragrances([unknown], [{ ...unknown, id: "another" }]),
  ).toHaveLength(1);
});
it("deduplicates concentration suffixes, punctuation and numeric spacing across pages", () => {
  const base = { ...curatedCatalog[0], reviewCount: 8 };
  const same = {
    ...base,
    id: "source",
    name: "Sauvage Eau de Parfum",
    concentration: "EDP",
    reviewCount: 0,
  };
  expect(mergeFragrances([base], [same])).toEqual([base]);
  const numbered = { ...base, name: "9 PM", brand: "Afnan" };
  expect(
    mergeFragrances([numbered], [{ ...numbered, id: "other", name: "9PM" }]),
  ).toHaveLength(1);
  const cologne = {
    ...base,
    name: "Wood Sage & Sea Salt",
    brand: "Jo Malone London",
    concentration: "Cologne",
  };
  expect(
    mergeFragrances(
      [cologne],
      [
        {
          ...cologne,
          id: "open",
          name: "Wood Sage and Sea Salt",
          concentration: "Not provided",
        },
      ],
    ),
  ).toEqual([cologne]);
  expect(
    mergeFragrances(
      [base],
      [
        {
          ...base,
          id: "elixir",
          name: "Sauvage Elixir",
          concentration: "Elixir",
        },
      ],
    ),
  ).toHaveLength(2);
  expect(
    mergeFragrances(
      [base],
      [{ ...base, id: "oil", concentration: "Perfume oil" }],
    ),
  ).toHaveLength(2);
});

it("does not create an extra edition from an Elixir marketing label", () => {
  const base = {
    ...curatedCatalog[0],
    name: "Odyssey Mandarin Sky Elixir",
    brand: "Armaf",
    concentration: "Eau de Parfum",
  };
  expect(
    mergeFragrances([base], [{ ...base, id: "open", concentration: "Elixir" }]),
  ).toEqual([base]);
});

it("merges house and collection labels without merging actual flankers", () => {
  const base = curatedCatalog[0];
  for (const [brand, a, b] of [
    [
      "Giorgio Armani",
      "Emporio Armani Stronger With You Intensely",
      "Stronger With You Intensely",
    ],
    [
      "Giorgio Armani",
      "Emporio Armani Stronger With You Absolutely",
      "Stronger With You Absolutely",
    ],
    ["Maison Margiela Fragrances", "Replica Jazz Club", "Jazz Club"],
    ["Acqua di Parma", "Blu Mediterraneo Arancia di Capri", "Arancia di Capri"],
    ["Jean Paul Gaultier", "Gaultier Divine", "Divine"],
    ["Le Labo", "Th\u00e9 Noir 29", "Noir 29"],
    ["Givenchy", "Irresistible Givenchy", "Irresistible"],
    ["Hugo Boss", "BOSS Bottled", "Bottled"],
  ])
    expect(
      mergeFragrances(
        [],
        [
          { ...base, id: "a", brand, name: a },
          { ...base, id: "b", brand, name: b },
        ],
      ),
    ).toHaveLength(1);
  expect(
    mergeFragrances(
      [],
      [
        {
          ...base,
          brand: "Emporio Armani",
          name: "Stronger With You Absolutely",
        },
        {
          ...base,
          id: "b",
          brand: "Giorgio Armani",
          name: "Emporio Armani Stronger With You Absolutely",
        },
      ],
    ),
  ).toHaveLength(1);
  for (const [a, b] of [
    ["Aventus", "Absolu Aventus"],
    ["Poison", "Hypnotic Poison"],
    ["Jazz Club", "Jazz Club Intense"],
    ["Stronger With You Intensely", "Stronger With You Absolutely"],
  ])
    expect(
      mergeFragrances(
        [],
        [
          { ...base, id: "a", name: a },
          { ...base, id: "b", name: b },
        ],
      ),
    ).toHaveLength(2);
});

it("preserves a matched bottle image when a richer duplicate wins, without crossing concentrations", () => {
  const open = {
    ...curatedCatalog[0],
    id: "open",
    name: "Stronger With You Intensely",
    brand: "Giorgio Armani",
    imageUrl: null,
    concentration: "EDP",
  };
  const live = {
    ...open,
    id: "live",
    name: "Emporio Armani Stronger With You Intensely",
    concentration: "Not provided",
    imageUrl: "https://imagedelivery.net/account/intensely/public",
    sourceUrl: "https://www.scento.com/perfumes/intensely",
  };
  const result = mergeFragrances([], [live, open]);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: "open",
    imageUrl: live.imageUrl,
    imageSourceUrl: live.sourceUrl,
  });
  const edt = { ...open, id: "edt", concentration: "EDT" };
  const ambiguous = mergeFragrances([], [live, open, edt]);
  expect(ambiguous).toHaveLength(2);
  expect(ambiguous.every((f) => f.imageUrl === null)).toBe(true);
});
