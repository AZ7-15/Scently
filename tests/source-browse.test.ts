import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
function mockSource() {
  const calls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input));
      calls.push(url);
      if (url.pathname === "/brands")
        return new Response(
          "<script>self.__next_f.push(" +
            JSON.stringify([
              1,
              '"brands":[{"id":"brand_dior","name":"Dior"},{"id":"brand_lattafa","name":"Lattafa"}]',
            ]) +
            ")</script>",
        );
      if (url.pathname === "/api/notes")
        return Response.json({ notes: [{ id: "note_rose", name: "Rose" }] });
      return Response.json({
        totalCount: 166,
        hasNextPage: true,
        products: [
          {
            id: "product-" + url.searchParams.get("page"),
            title: "Source floral",
            handle: "source-floral",
            subtitle: "Dior",
            thumbnail: "https://imagedelivery.net/account/product/public",
            metadata: {
              concentration: "Eau de Parfum",
              launch_year: "2020",
              main_accords: ["floral"],
              scent_type: "floral",
              fragrantica_rating: 4.9,
              season: "all-seasons",
            },
            product_notes: [{ note_type: "heart", note: { name: "Rose" } }],
          },
        ],
      });
    }),
  );
  return calls;
}
it("browses the full paginated listing without a search term or fabricated community statistics", async () => {
  const calls = mockSource();
  const { browseSourceCatalog } = await import("../lib/server/source-browse");
  const first = await browseSourceCatalog({});
  expect(first.providerTotal).toBe(166);
  expect(first.continuation).toBe("browse:2");
  expect(first.results[0]).toMatchObject({
    year: 2020,
    rating: null,
    reviewCount: 0,
    longevity: null,
    imageUrl: "https://imagedelivery.net/account/product/public",
  });
  await browseSourceCatalog({}, first.continuation!);
  expect(calls.at(-1)?.searchParams.get("page")).toBe("2");
});
it("sends brand, note and accord filters upstream before pagination", async () => {
  const calls = mockSource();
  const { browseSourceCatalog } = await import("../lib/server/source-browse");
  const result = await browseSourceCatalog({
    brand: "Dior",
    notes: ["Rose", "Floral"],
  });
  const params = calls.at(-1)!.searchParams;
  expect(params.get("brands")).toBe("brand_dior");
  expect(params.get("notes")).toBe("note_rose");
  expect(params.get("fragrance_family")).toBe("floral");
  expect(result.results).toHaveLength(1);
});
it("rejects invalid cursors without fetching a page", async () => {
  const calls = mockSource();
  const { browseSourceCatalog } = await import("../lib/server/source-browse");
  await expect(browseSourceCatalog({}, "browse:NaN")).rejects.toMatchObject({
    status: 400,
  });
  expect(calls).toHaveLength(0);
});
