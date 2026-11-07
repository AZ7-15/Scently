import { test, expect } from "@playwright/test";
test("the new landing page leads into the same illustrated fragrance experience", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-app-ready="true"]').waitFor();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Find your scent.",
  );
  await expect(
    page.locator(".landing-portrait .product-photo img"),
  ).toBeVisible();
  await expect(
    page.locator('img[src="/images/fragrance-still-life.png"]'),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Discover Tobacco Vanille", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tobacco Vanille", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".fragrance-bottle-scene")).toBeVisible();
  await page.getByRole("link", { name: "Explore the composition" }).click();
  await expect(
    page.getByRole("heading", { name: "Fragrance composition", exact: true }),
  ).toBeVisible();
});
test("every community fragrance uses the shared story layout", async ({
  page,
  request,
}) => {
  const data = await (await request.get("/api/catalog")).json();
  const local = data.results.filter(
    (f: { externalLookup?: string }) => !f.externalLookup,
  );
  expect(local.length).toBeGreaterThanOrEqual(6);
  for (const fragrance of local) {
    await page.goto("/fragrances/" + fragrance.slug);
    await page.locator('[data-app-ready="true"]').waitFor();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      fragrance.name,
    );
    await expect(page.locator(".fragrance-bottle-scene")).toBeVisible();
    await expect(page.locator(".scene-product img")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore the composition" }),
    ).toHaveAttribute("href", "#composition");
    await expect(page.locator(".season-story-card")).toHaveCount(4);
    await expect(page.locator(".ingredient-card")).toHaveCount(
      fragrance.notes.length,
    );
  }
});
