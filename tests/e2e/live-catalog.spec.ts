import { test, expect } from "@playwright/test";
import type { Fragrance } from "../../lib/domain";
function fragrance(name: string, note: string) {
  return {
    id: "source-" + name,
    externalLookup: name.toLowerCase() + "-lattafa",
    name,
    brand: "Lattafa",
    imageUrl: null,
    notes: [{ name: note, stage: "top" }],
    sourceUrl:
      "https://www.scento.com/perfumes/" + name.toLowerCase() + "-lattafa",
    slug: name.toLowerCase(),
    concentration: "Eau de Parfum",
    description: "Browser test fragrance fixture.",
    year: null,
    perfumer: null,
    style: "all",
    family: "warm",
    color: "#b7a47d",
    shape: "round",
    accords: ["Warm"],
    editorialSeasons: ["winter"],
    occasions: [],
    sourceName: "Test fixture",
    checkedAt: new Date().toISOString(),
    demo: true,
    rating: null,
    reviewCount: 0,
    longevity: null,
    projection: null,
    performanceVotes: 0,
    seasonVotes: {},
    offers: [],
  } satisfies Fragrance;
}
test("one catalog combines source searches, photos, pagination and filters", async ({
  page,
}) => {
  await page.route("**/api/catalog/photo?**", (route) =>
    route.fulfill({
      json: {
        images: [{ url: "/favicon.svg", sourceUrl: "https://www.scento.com" }],
      },
    }),
  );
  let calls = 0;
  await page.route(/\/api\/catalog\?/, async (route) => {
    calls++;
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("q")).toBe("Lattafa");
    await route.fulfill({
      json: {
        results: [
          fragrance(
            params.has("continuation") ? "Yara" : "Khamrah",
            params.has("continuation") ? "Orchid" : "Cinnamon",
          ),
        ],
        providerTotal: 23,
        continuation: params.has("continuation") ? null : "cursor-2",
      },
    });
  });
  await page.goto("/fragrances");
  await page.locator('[data-app-ready="true"]').waitFor();
  await expect(
    page.getByRole("navigation", { name: "Catalog source" }),
  ).toHaveCount(0);
  await page.getByLabel("Search catalog").fill("Lattafa");
  await page.getByRole("button", { name: "Search database" }).click();
  await expect(page.getByRole("status").last()).toContainText("1 fragrances");
  const khamrah = page.locator(".product-card").filter({ hasText: "Khamrah" });
  await khamrah.scrollIntoViewIfNeeded();
  const detailUrl = new URL(
    (await khamrah.locator("h3 a").getAttribute("href")) || "",
    "https://example.com",
  );
  expect(detailUrl.searchParams.get("name")).toBe("Khamrah");
  expect(detailUrl.searchParams.get("brand")).toBe("Lattafa");
  expect(detailUrl.searchParams.get("concentration")).toBe("Eau de Parfum");
  await expect(khamrah.locator("img")).toHaveAttribute(
    "alt",
    "Lattafa Khamrah bottle",
  );
  await page.getByRole("button", { name: "Load more fragrances" }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByLabel("Add a note").selectOption("Cinnamon");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("Khamrah");
  expect(calls).toBe(2);
});
test("source failure gives a retry within the same catalog", async ({
  page,
}) => {
  let attempts = 0;
  await page.route(/\/api\/catalog\?/, async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 502,
        json: { error: "Source unavailable" },
      });
    else
      await route.fulfill({
        json: { results: [], providerTotal: 0, continuation: null },
      });
  });
  await page.goto("/fragrances");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByLabel("Brand", { exact: true }).selectOption("Armaf");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Source unavailable",
  );
  await page.getByRole("button", { name: "Try search again" }).click();
  await expect(
    page.getByRole("heading", { name: "No scents found. Yet." }),
  ).toBeVisible();
});

test("one filter panel queries beyond loaded cards and preserves filters on the next page", async ({
  page,
}) => {
  const requests: URL[] = [];
  await page.route(/\/api\/catalog\?/, async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    expect(url.searchParams.get("q")).toBe("");
    expect(url.searchParams.get("note")).toBe("Floral");
    await route.fulfill({
      json: {
        results: [
          {
            ...fragrance(
              url.searchParams.has("continuation")
                ? "Floral Two"
                : "Floral One",
              "Rose",
            ),
            accords: ["Floral"],
          },
        ],
        providerTotal: 166,
        continuation: url.searchParams.has("continuation") ? null : "browse:2",
      },
    });
  });
  await page.goto("/fragrances");
  await page.locator('[data-app-ready="true"]').waitFor();
  expect(
    await page.getByLabel("Brand", { exact: true }).locator("option").count(),
  ).toBeGreaterThan(100);
  await page.getByLabel("Add a note").selectOption("Floral");
  await expect(page.locator(".product-card")).toContainText(["Floral One"]);
  await page.getByRole("button", { name: "Load more fragrances" }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  expect(requests.at(-1)?.searchParams.get("continuation")).toBe("browse:2");
});
