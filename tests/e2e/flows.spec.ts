import { test, expect, type Page } from "@playwright/test";
async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('[data-app-ready="true"]')).toBeAttached();
}
async function register(page: Page, path: string) {
  const response = await page.request.post("/api/auth", {
    data: {
      action: "register",
      name: "Browser test",
      email: `test-${crypto.randomUUID()}@example.com`,
      password: "Browser-test-password-2026",
    },
  });
  expect(response.status()).toBe(200);
  await visit(page, path);
}
test("known search opens its profile and note pyramid", async ({ page }) => {
  await visit(page, "/fragrances");
  await page
    .getByRole("textbox", { name: "Search catalog" })
    .fill("Dior Sauvage");
  await expect(
    page.getByRole("link", { name: "Sauvage", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sauvage", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Fragrance pyramid" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "top notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bergamot", exact: true }),
  ).toBeVisible();
});
test("search vanilla, combine filters, reset", async ({ page }) => {
  await visit(page, "/fragrances?view=community");
  await page.getByRole("textbox", { name: "Search catalog" }).fill("vanila");
  await expect(
    page.locator(".product-card").filter({ hasText: "Tobacco Vanille" }),
  ).toBeVisible();
  await page.getByLabel("winter", { exact: true }).check();
  await expect(
    page.locator(".product-card").filter({ hasText: "Tobacco Vanille" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByLabel("Search catalog")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Compare Sauvage", exact: true }),
  ).toBeVisible();
});
test("compare two fragrances", async ({ page }) => {
  await visit(page, "/fragrances?view=community");
  const sauvage = page
    .locator(".product-card")
    .filter({
      has: page.getByRole("button", { name: "Save Sauvage", exact: true }),
    });
  await sauvage
    .getByRole("button", { name: "Compare Sauvage", exact: true })
    .click();
  await expect(
    sauvage.getByRole("button", { name: "Remove Sauvage", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Compare Santal 33", exact: true })
    .click();
  await page.getByRole("link", { name: "Compare scents" }).click();
  await expect(page.locator(".comparison-card")).toHaveCount(2);
  await expect(page.locator(".comparison-row.different").first()).toBeVisible();
});
test("finder uses catalog evidence and respects hard budgets", async ({
  page,
}) => {
  await visit(page, "/finder");
  await page
    .getByLabel("Describe your ideal fragrance")
    .fill(
      "masculine vanilla fragrance lasting 6–8 hours with strong projection",
    );
  await page
    .getByRole("button", { name: "Find fragrances", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Near matches — preferences not fully verified",
    }),
  ).toBeVisible();
  await expect(page.locator(".match-card").first()).toContainText(
    "Longevity has not been established",
  );
  await page
    .getByLabel("Describe your ideal fragrance")
    .fill("Must be under $100");
  await page
    .getByRole("button", { name: "Find fragrances", exact: true })
    .click();
  await expect(page.locator(".chat-turn")).toHaveCount(2);
  await expect(page.locator(".chat-turn").last()).toContainText(
    "No current verified total",
  );
  await expect(
    page
      .locator(".chat-turn")
      .last()
      .getByRole("heading", { name: "Matches your preferences", exact: true }),
  ).toHaveCount(0);
});
test("unauthenticated and non-admin writes fail", async ({ request, page }) => {
  expect((await request.post("/api/reviews", { data: {} })).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin", {
        data: { action: "moderate", id: "x", status: "hidden" },
      })
    ).status(),
  ).toBe(401);
  await register(page, "/account");
  expect(
    (
      await page.request.post("/api/reviews", {
        data: { fragranceId: "sauvage-edp", rating: 9, content: "short" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/admin", {
        data: { action: "moderate", id: "x", status: "hidden" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/collection", {
        headers: { Origin: "https://untrusted.example" },
        data: { fragranceId: "sauvage-edp", status: "wishlist" },
      })
    ).status(),
  ).toBe(403);
});
test("authenticated shelf and review persist, then clean up", async ({
  page,
}) => {
  await register(page, "/fragrances/dior-sauvage-eau-de-parfum");
  await page
    .getByRole("button", { name: "Save to my shelf", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Saved to your shelf" }),
  ).toBeVisible();
  await visit(page, "/account");
  await expect(page.locator(".shelf-item")).toContainText("Sauvage");
  await visit(page, "/fragrances/dior-sauvage-eau-de-parfum");
  await page
    .getByLabel("Your review", { exact: true })
    .fill("Automated test review, removed at the end of this local test.");
  await page.getByLabel("Longevity (hours, optional)").fill("7");
  await page.getByLabel("Projection (optional)").selectOption("strong");
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.locator(".review-card")).toContainText(
    "Automated test review",
  );
  await page.reload();
  await expect(page.locator('[data-app-ready="true"]')).toBeAttached();
  await expect(page.locator(".review-card")).toContainText(
    "Automated test review",
  );
  await page
    .getByRole("button", { name: "Delete review", exact: true })
    .click();
  await expect(page.locator(".review-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Saved to your shelf" }).click();
});
test("mobile layouts and keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/fragrances",
    "/fragrances/dior-sauvage-eau-de-parfum",
    "/finder",
    "/compare",
    "/reviews",
    "/account",
  ]) {
    await visit(page, path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await visit(page, "/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});
test("public pages have no browser errors and capture layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await visit(page, "/");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await visit(page, "/fragrances/dior-sauvage-eau-de-parfum");
  await page.screenshot({
    path: "test-results/detail-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "/");
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
