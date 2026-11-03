import { expect, it } from "vitest";
import { catalogFilters, catalogParameters } from "../lib/catalog-filters";
it("preserves the same combined filters in links and API pagination", () => {
  const filters = {
    q: "",
    brand: "Dior",
    notes: ["Rose", "Floral"],
    seasons: ["summer"],
    concentration: "EDP",
    minHours: 8,
  };
  expect(catalogFilters(catalogParameters(filters))).toMatchObject(filters);
});
