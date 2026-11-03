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
