import { expect, it, vi } from "vitest";
vi.mock("../lib/server/catalog", () => ({ getCatalog: vi.fn(async () => []) }));
vi.mock("../lib/server/scento", () => ({
  searchLiveFragrances: vi.fn(async () => ({
    total: 2,
    continuation: null,
    matches: [
      {
        name: "Sauvage",
        brand: "Dior",
        family: "Woody",
        lookup: "sauvage",
        sourceUrl: "https://www.scento.com/perfumes/sauvage-dior",
      },
      {
        name: "Layton",
        brand: "Parfums de Marly",
        family: "Woody",
        lookup: "layton",
        sourceUrl: "https://www.scento.com/perfumes/layton-parfums-de-marly",
      },
    ],
  })),
  getLiveFragrance: vi.fn(async () => ({
    name: "Sauvage Elixir",
    brand: "Dior",
    concentration: "Elixir",
    notes: ["Wrong note"],
    pyramid: { top: ["Wrong note"], heart: [], base: [] },
    seasons: [],
    family: "Woody",
  })),
}));
import { searchUnifiedCatalog } from "../lib/server/unified-catalog";
it("withholds mismatched profile facts and excludes unrelated provider suggestions", async () => {
  const result = await searchUnifiedCatalog("Dior Sauvage");
  expect(result.results).toHaveLength(1);
  expect(result.results[0]).toMatchObject({
    name: "Sauvage",
    brand: "Dior",
    concentration: "Not provided",
    notes: [],
    year: null,
  });
  expect(result.notice).toContain("Unrelated source suggestions were excluded");
});
