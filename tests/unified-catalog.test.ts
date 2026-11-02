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
