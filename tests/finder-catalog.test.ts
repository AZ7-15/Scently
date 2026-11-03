import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { curatedCatalog } from "../data/catalog";
import { criteriaSchema } from "../lib/domain";
vi.mock("../lib/server/open-catalog", () => ({
  getOpenCatalog: async () => [],
}));
const source = vi.hoisted(() => ({ browse: vi.fn(), search: vi.fn() }));
vi.mock("../lib/server/source-browse", () => ({
  sourceFacets: async () => ({
    brands: [
      { id: "brand-afnan", name: "Afnan", isNiche: false },
      { id: "brand-xerjoff", name: "Xerjoff", isNiche: true },
    ],
    notes: [
      { id: "note-vanilla", name: "Vanilla" },
      { id: "note-musk", name: "Musk" },
      { id: "note-white-musk", name: "White Musk" },
    ],
    vocabulary: ["Vanilla", "White Musk", "Musk", "Pistachio"],
  }),
  browseSourceCatalog: source.browse,
}));
vi.mock("../lib/server/unified-catalog", () => ({
  searchUnifiedCatalog: source.search,
}));
import { findFragrances } from "../lib/server/finder";
import {
  finderCandidates,
  interpretCatalogCriteria,
} from "../lib/server/finder-catalog";
afterEach(() => vi.unstubAllEnvs());
const external = {
  ...curatedCatalog[0],
  id: "remote-naxos",
  slug: "naxos-xerjoff",
  externalLookup: "naxos-xerjoff",
  name: "Naxos",
  brand: "Xerjoff",
  niche: true,
  style: "masculine",
  editorialSeasons: ["winter" as const],
  notes: [{ name: "Vanilla", stage: "base" as const }],
  accords: ["Sweet"],
  rating: null,
  offers: [],
};
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  source.browse.mockReset().mockResolvedValue({
    results: [external],
    continuation: "browse:2",
    providerTotal: 82,
    notice: "",
  });
  source.search.mockReset().mockResolvedValue({
    results: [external],
    continuation: null,
    providerTotal: 8,
    notice: "",
  });
});
it("retrieves source candidates before ranking rather than limiting the finder to starter records", async () => {
  const r = await findFragrances(
    "masculine vanilla for winter",
    curatedCatalog,
    undefined,
    "CA",
    "finder-test",
  );
  expect(source.browse).toHaveBeenCalledWith(
    expect.objectContaining({ notes: ["vanilla"], style: "masculine" }),
    undefined,
    { candidates: true },
  );
  expect(r.matches[0].fragrance.id).toBe("remote-naxos");
  expect(r.coverage).toMatchObject({
    scope: "source-catalog",
    totalCandidates: 82,
  });
  expect(r.continuation).toBe("browse:2");
});
it("preserves criteria on further pages and excludes recommendations already shown", async () => {
  source.browse.mockResolvedValueOnce({
    results: [
      { ...external, id: "remote-next", name: "A different source perfume" },
    ],
    continuation: null,
    providerTotal: 82,
    notice: "",
  });
  const criteria = criteriaSchema.parse({
    notes: ["Vanilla"],
    season: "winter",
    style: "masculine",
  });
  const r = await findFragrances(
    "original request",
    curatedCatalog,
    criteria,
    "CA",
    "finder-test",
    "browse:2",
    ["remote-naxos", ...curatedCatalog.map((f) => f.id)],
  );
  expect(r.criteria).toEqual(criteria);
  expect(r.matches.map((m) => m.fragrance.id)).toEqual(["remote-next"]);
  expect(source.browse.mock.calls[0][1]).toBe("browse:2");
});
it("recognizes source vocabulary and sends rarer material searches to the full search source", async () => {
  const c = await interpretCatalogCriteria(
    "something with pistachio",
    curatedCatalog,
  );
  expect(c.notes).toEqual(["pistachio"]);
  await finderCandidates(c, curatedCatalog);
  expect(source.search).toHaveBeenCalledWith("pistachio", undefined);
  const multi = await interpretCatalogCriteria("white musk", curatedCatalog);
  expect(multi.notes).toEqual(["white musk"]);
});
it("recognizes brand preferences and does not replace a failed full-source search with starter-only results", async () => {
  const c = await interpretCatalogCriteria(
    "Afnan with vanilla",
    curatedCatalog,
  );
  expect(c.brand).toBe("Afnan");
  expect(
    (await interpretCatalogCriteria("any brand", curatedCatalog, c)).brand,
  ).toBeNull();
  source.browse.mockRejectedValue(new Error("Source unavailable"));
  await expect(
    findFragrances("vanilla", curatedCatalog, undefined, "CA", "finder-test"),
  ).rejects.toThrow("Source unavailable");
});
it("keeps unknown price and performance constraints visible as gaps", async () => {
  const r = await findFragrances(
    "vanilla lasting 8 hours under $100",
    curatedCatalog,
    undefined,
    "CA",
    "finder-test",
  );
  expect(r.matches.every((m) => !m.exact)).toBe(true);
  expect(
    r.matches.find((m) => m.fragrance.id === external.id)?.gaps.join(" "),
  ).toContain("No current verified total");
});

it("restricts latest-arrivals requests to the live feed", async () => {
  source.browse.mockResolvedValueOnce({
    results: [{ ...external, notes: [{ name: "Pistachio", stage: "top" }] }],
    continuation: null,
    providerTotal: 1,
    notice: "",
  });
  const r = await findFragrances(
    "latest arrivals with pistachio",
    curatedCatalog,
    undefined,
    "CA",
    "finder-test",
  );
  expect(source.search).not.toHaveBeenCalled();
  expect(source.browse).toHaveBeenCalledWith(
    expect.objectContaining({ sort: "newest" }),
    undefined,
    { candidates: true },
  );
  expect(r.criteria.newArrivals).toBe(true);
  expect(r.matches.map((m) => m.fragrance.id)).toEqual([external.id]);
  expect(r.matches[0].fragrance.isNewArrival).toBe(true);
  expect(r.catalogHref).toContain("sort=newest");
});
