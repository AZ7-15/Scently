import { test, expect } from "@playwright/test";
test("saved, live and published profiles expose the same detail sections", async ({
  page,
}) => {
  for (const path of [
    "/fragrances/dior-sauvage-eau-de-parfum",
    "/discover/le-male-elixir-jean-paul-gaultier",
    "/discover/open%3Aarmani-stronger-with-you-absolutely",
  ]) {
    await page.goto(path);
    await expect(page.locator(".fragrance-story-hero")).toBeVisible();
    for (const id of [
      "composition",
      "season-story",
      "performance",
      "reviews",
      "prices",
      "fragrance-sources",
    ]) {
      await expect(page.locator("#" + id)).toHaveCount(1);
      await expect(
        page.locator('.fragrance-story-nav a[href="#' + id + '"]'),
      ).toHaveCount(1);
    }
    await expect(page.locator("#performance .metric")).toHaveCount(3);
  }
  const bottle = page.locator(".scene-product img");
  await expect(bottle).toBeVisible({ timeout: 20000 });
  await expect
    .poll(
      () =>
        bottle.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/researched-profile-mobile.png",
    fullPage: true,
  });
});
test("a failed photo lookup can be retried without reloading the profile", async ({
  page,
}) => {
  await page.route("https://imagedelivery.net/**", (route) => route.abort());
  await page.route(/\/api\/catalog\/photo\?/, (route) => {
    const retry = new URL(route.request().url()).searchParams.get("retry");
    return route.fulfill({
      json: {
        images: retry
          ? [
              {
                url: "/favicon.svg",
                sourceUrl:
                  "https://www.scento.com/perfumes/le-male-elixir-jean-paul-gaultier",
              },
            ]
          : [],
      },
    });
  });
  await page.goto("/discover/le-male-elixir-jean-paul-gaultier");
  await page.locator('[data-app-ready="true"]').waitFor();
  const photo = page.locator(".scene-product");
  await photo.getByRole("button", { name: "Try photo again" }).click();
  await expect(photo.locator('img[src="/favicon.svg"]')).toBeVisible();
});
