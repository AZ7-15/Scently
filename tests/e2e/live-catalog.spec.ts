import { test, expect } from "@playwright/test";
test("live search and load-more retain the query and show source links", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/discovery/search?**", async (route) => {
    calls++;
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("q")).toBe("Lattafa");
    const next = params.has("continuation");
    await route.fulfill({
      json: {
        query: "Lattafa",
        total: 23,
        matches: [
          {
            name: next ? "Yara" : "Khamrah",
            brand: "Lattafa",
            family: "Velvet Sweet",
            lookup: next ? "yara-lattafa" : "khamrah-lattafa",
            sourceUrl: "https://www.scento.com/perfumes/khamrah-lattafa",
          },
        ],
        continuation: next ? null : "cursor-2",
        source: "Scento Perfume API",
      },
    });
  });
  await page.goto("/fragrances");
  await page.getByLabel("Search fragrance database").fill("Lattafa");
  await page.getByRole("button", { name: "Search database" }).click();
  await expect(page.locator(".results-summary")).toContainText("23 results");
  await expect(
    page.getByRole("link", { name: "Khamrah", exact: true }),
  ).toHaveAttribute("href", "/discover/khamrah-lattafa");
  await page.getByRole("button", { name: "Load more fragrances" }).click();
  await expect(page.locator(".live-result-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Load more fragrances" }),
  ).toHaveCount(0);
  expect(calls).toBe(2);
});
test("upstream failure gives a working retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/discovery/search?**", async (route) => {
    attempts++;
    if (attempts === 1)
      await route.fulfill({
        status: 502,
        json: { error: "Source unavailable" },
      });
    else
      await route.fulfill({
        json: {
          query: "Armaf",
          total: 0,
          matches: [],
          continuation: null,
          source: "Scento Perfume API",
        },
      });
  });
  await page.goto("/fragrances");
  await page.getByRole("button", { name: "Armaf", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Source unavailable",
  );
  await page.getByRole("button", { name: "Try search again" }).click();
  await expect(
    page.getByRole("heading", {
      name: "No matching records from this source.",
    }),
  ).toBeVisible();
});
