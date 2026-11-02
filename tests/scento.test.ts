import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLiveFragrances, getLiveFragrance } from "../lib/server/scento";
const source = "https://www.scento.com/perfumes/test-lattafa";
afterEach(() => vi.unstubAllGlobals());
describe("Scento live API adapter", () => {
  it("validates search data, preserves pagination, and coalesces repeated lookups", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            folio: "perfume-search",
            detail: {
              total: 23,
              matches: [
                {
                  kind: "perfume",
                  name: "Test",
                  house: "Lattafa",
                  family: "Amber",
                  page: source,
                },
              ],
            },
            continuation: "next-page",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const [first, second] = await Promise.all([
      searchLiveFragrances("test-lattafa"),
      searchLiveFragrances("test-lattafa"),
    ]);
    expect(first).toEqual(second);
    expect(first.total).toBe(23);
    expect(first.continuation).toBe("next-page");
    expect(first.matches[0]).toMatchObject({
      brand: "Lattafa",
      lookup: "test-lattafa",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = String(fetcher.mock.calls[0][0]);
    expect(new URL(url).origin).toBe("https://www.scento.com");
  });
  it("maps note stages without inventing concentration, images or performance", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              folio: "perfume-portrait",
              detail: {
                name: "Test profile",
                house: "Lattafa",
                concentration: null,
                year: 2022,
                family: "Amber",
                character: "Test description",
                pyramid: {
                  top: ["Cinnamon"],
                  heart: ["Dates"],
                  base: ["Vanilla"],
                },
                wears: { seasons: ["winter"] },
              },
              scento_page: { url: source },
            }),
          ),
        ),
    );
    const profile = await getLiveFragrance("test-profile-unit");
    expect(profile.pyramid.base).toEqual(["Vanilla"]);
    expect(profile.concentration).toBeNull();
    expect(profile).not.toHaveProperty("longevity");
    expect(profile.sourceUrl).toBe(source);
  });
  it("handles rate limits and malformed provider URLs safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );
    await expect(
      searchLiveFragrances("rate-limited-test"),
    ).rejects.toMatchObject({ status: 429 });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              folio: "perfume-search",
              detail: {
                total: 1,
                matches: [
                  {
                    kind: "perfume",
                    name: "Invalid",
                    house: "Test",
                    page: "javascript:alert(1)",
                  },
                ],
              },
            }),
          ),
        ),
    );
    await expect(searchLiveFragrances("invalid-url-test")).rejects.toThrow(
      "unexpected response",
    );
  });
});
