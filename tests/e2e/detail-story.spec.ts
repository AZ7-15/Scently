import { test, expect } from "@playwright/test";
test("fragrance story has a visible bottle, illustrated layers and working note links", async ({
  page,
}) => {
  await page.goto("/discover/le-male-elixir-jean-paul-gaultier");
  await page.locator('[data-app-ready="true"]').waitFor();
  await expect(
    page.getByRole("heading", { name: "Le Male Elixir", exact: true }),
  ).toBeVisible();
  const bottle = page.locator(".scene-product img");
  await expect(bottle).toBeVisible();
  await expect
    .poll(() =>
      bottle.evaluate(
        (img: HTMLImageElement) =>
          img.complete &&
          img.naturalWidth > 0 &&
          img.getBoundingClientRect().height > 250,
      ),
    )
    .toBe(true);
  await page.getByRole("link", { name: "Explore the composition" }).click();
  await expect(page.locator(".ingredient-card")).toHaveCount(7);
  for (const name of [
    "Lavender",
    "Mint",
    "Vanilla",
    "Benzoin",
    "Honey",
    "Tonka Bean",
    "Tobacco",
  ]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      new RegExp("note=" + encodeURIComponent(name).replace(/%20/g, "\\+")),
    );
  }
  await expect(page.locator(".note-portrait img")).toHaveCount(7, {
    timeout: 20000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Mint", exact: true }).click();
  await expect(page).toHaveURL(/note=Mint/);
});
