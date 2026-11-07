import { test, expect } from "@playwright/test";
test("a brand exposes its published flanker index beyond the storefront page", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/catalog?brand=Armaf");
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.results.length).toBeGreaterThanOrEqual(189);
  expect(
    data.results.some(
      (f: { name: string }) => f.name === "Club de Nuit Precieux",
    ),
  ).toBe(true);
  await page.goto("/discover/open%3Aarmaf-club-de-nuit-precieux");
  await expect(
    page.getByRole("heading", { name: "Club de Nuit Precieux", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".fragrance-story-hero")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fragrance composition", exact: true }),
  ).toBeVisible();
});
test("new-arrivals selection requests the live feed and preserves it in the URL", async ({
  page,
}) => {
  await page.route(/\/api\/catalog\?/, async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("sort")).toBe("newest");
    await route.fulfill({
      json: { results: [], continuation: null, providerTotal: 0, notice: "" },
    });
  });
  await page.goto("/fragrances");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByLabel("Sort fragrances").selectOption("newest");
  await expect(page).toHaveURL(/sort=newest/);
  await expect(
    page.getByText(/A new arrival can be an older fragrance newly stocked/),
  ).toBeVisible();
});

test("Armani shows one card per Stronger With You edition", async ({
  request,
}) => {
  const response = await request.get("/api/catalog?brand=Giorgio%20Armani");
  expect(response.ok()).toBe(true);
  const data = await response.json();
  for (const edition of [
    "stronger with you intensely",
    "stronger with you absolutely",
  ])
    expect(
      data.results.filter((f: { name: string }) =>
        f.name.toLowerCase().endsWith(edition),
      ),
      edition,
    ).toHaveLength(1);
});
