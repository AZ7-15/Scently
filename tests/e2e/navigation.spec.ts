import { test, expect } from "@playwright/test";

test("every starter fragrance has a working product photograph", async ({
  page,
}) => {
  await page.goto("/fragrances?view=community");
  const photos = page.locator(
    '.product-card:has(button[aria-label^="Save "]) .bottle-stage img',
  );
  await expect(photos).toHaveCount(6);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        photo.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  await page.getByRole("link", { name: "Sauvage", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Product photo · manufacturer source" }),
  ).toHaveAttribute("href", /dior\.com/);
});

test("all main navigation and footer links work in the production build", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  for (const [name, path] of [
    ["Fragrances", "/fragrances"],
    ["Reviews", "/reviews"],
    ["AI Finder", "/finder"],
    ["Discover", "/"],
  ]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(path === "/" ? "/$" : path + "$"));
    await expect(page.locator("main h1")).toBeVisible();
  }
  for (const name of [
    "About",
    "Data sources",
    "FAQ",
    "Contact",
    "Privacy",
    "Terms",
    "Affiliate disclosure",
  ]) {
    await page
      .getByRole("navigation", { name: "Footer" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp("/info/" + name.toLowerCase().replaceAll(" ", "-") + "$"),
    );
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("fragrance navigation remains available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: test.info().project.use.baseURL,
  });
  const page = await context.newPage();
  await page.goto("/fragrances");
  await page.getByRole("link", { name: "Sauvage", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fragrance pyramid" }),
  ).toBeVisible();
  await context.close();
});

test("category, note, compare, region, and finder controls work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Warm & Sweet/ }).click();
  await expect(page).toHaveURL(/family=warm/);
  await expect(page.locator('[data-app-ready="true"]')).toBeAttached();
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page
    .getByRole("button", { name: "Compare Sauvage", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare Santal 33", exact: true })
    .click();
  await page.getByRole("link", { name: "Compare scents" }).click();
  await expect(page.locator(".comparison-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove Sauvage", exact: true })
    .click();
  await expect(page.locator(".comparison-card")).toHaveCount(1);
  await page.getByLabel("Shopping region and currency").selectOption("US");
  await page.reload();
  await expect(page.getByLabel("Shopping region and currency")).toHaveValue(
    "US",
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "AI Finder" })
    .click();
  await page.locator('[data-app-ready="true"]').waitFor();
  await page
    .getByRole("button", { name: "I want a masculine vanilla fragrance." })
    .click();
  await expect(page.locator(".chat-turn")).toHaveCount(1);
  await page.getByRole("button", { name: "Start a new discovery" }).click();
  await expect(page.locator(".chat-turn")).toHaveCount(0);
});
