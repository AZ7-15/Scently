import { test, expect } from "@playwright/test";
import type { Fragrance } from "../../lib/domain";
function fragrance(id: string, name: string, brand: string): Fragrance {
  return {
    id,
    slug: id,
    externalLookup: id,
    name,
    brand,
    description: "Test-only source record outside the starter set.",
    concentration: "Eau de Parfum",
    year: null,
    perfumer: null,
    style: "all",
    family: "warm",
    color: "#b7a47d",
    shape: "round",
    imageUrl: "/favicon.svg",
    accords: ["Vanilla"],
    notes: [{ name: "Vanilla", stage: "base" }],
    editorialSeasons: ["winter"],
    occasions: [],
    sourceUrl: "https://www.scento.com/perfumes/" + id,
    sourceName: "Test fixture",
    checkedAt: "2026-11-03T00:00:00.000Z",
    demo: true,
    rating: null,
    reviewCount: 0,
    longevity: null,
    projection: null,
    performanceVotes: 0,
    seasonVotes: {},
    offers: [],
  };
}
test("landing autocomplete searches the full catalog and links external profiles correctly", async ({
  page,
}) => {
  const external = fragrance("global-one", "Outside starter catalog", "Afnan");
  await page.route(/\/api\/catalog\?/, async (route) => {
    expect(new URL(route.request().url()).searchParams.get("q")).toBe("Afnan");
    await route.fulfill({
      json: { results: [external], continuation: null, providerTotal: 40 },
    });
  });
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page
    .getByRole("textbox", { name: "Search fragrances, brands, or notes" })
    .fill("Afnan");
  const suggestion = page
    .getByRole("list", { name: "Search suggestions" })
    .getByRole("link", { name: /Outside starter catalog/ });
  await expect(suggestion).toBeVisible();
  await expect(suggestion).toHaveAttribute("href", /^\/discover\/global-one\?/);
  await expect(
    page.getByRole("link", { name: "View all catalog results" }),
  ).toHaveAttribute("href", "/fragrances?q=Afnan");
});
test("more finder recommendations retain criteria and append new source records", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/finder", async (route) => {
    count++;
    const body = route.request().postDataJSON();
    if (count === 2) {
      expect(body.continuation).toBe("browse:2");
      expect(body.previous.notes).toEqual(["Vanilla"]);
      expect(body.seen).toEqual(["global-one"]);
    }
    const item = fragrance(
      count === 1 ? "global-one" : "global-two",
      count === 1 ? "First global match" : "Next global match",
      count === 1 ? "Xerjoff" : "Afnan",
    );
    await route.fulfill({
      json: {
        criteria: { notes: ["Vanilla"], excludeNotes: [], brand: null },
        matches: [
          {
            fragrance: item,
            reasons: ["Includes vanilla."],
            gaps: [],
            exact: true,
            score: 1,
          },
        ],
        mode: "rules",
        notice: "Searching the source catalog.",
        message: "Catalog matches",
        continuation: count === 1 ? "browse:2" : null,
        coverage: {
          scope: "source-catalog",
          assessed: 12,
          totalCandidates: 82,
          sourceCandidates: 12,
        },
        catalogHref: "/fragrances?note=Vanilla",
      },
    });
  });
  await page.goto("/finder");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page
    .getByLabel("Describe your ideal fragrance")
    .fill("Vanilla for winter");
  await page
    .getByRole("button", { name: "Find fragrances", exact: true })
    .click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page.getByRole("button", { name: "More recommendations" }).click();
  await expect(page.locator(".match-card")).toHaveCount(2);
  await expect(page.locator(".match-card").last()).toContainText(
    "Next global match",
  );
});
test("comparison searches beyond starters and retains selected source records after reload", async ({
  page,
}) => {
  const external = fragrance("global-compare", "Source Pistachio", "Afnan");
  await page.route(/\/api\/catalog\?/, (route) =>
    route.fulfill({
      json: { results: [external], continuation: null, providerTotal: 1 },
    }),
  );
  await page.goto("/compare");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByLabel("Search fragrances to compare").fill("Pistachio");
  await page
    .getByRole("button", { name: "Search catalog", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Source Pistachio.*Add to comparison/ })
    .click();
  await expect(page.locator(".comparison-card")).toHaveCount(1);
  await expect(page.locator(".comparison-card")).toContainText(
    "Source Pistachio",
  );
  await page.reload();
  await expect(page.locator(".comparison-card")).toContainText(
    "Source Pistachio",
  );
  await page
    .getByRole("button", { name: "Remove Source Pistachio", exact: true })
    .click();
  await expect(page.locator(".comparison-card")).toHaveCount(0);
});
