import { test, expect } from "@playwright/test";

test("register, sign out, reject a wrong password, and sign back in", async ({
  page,
}) => {
  const email = `account-${crypto.randomUUID()}@example.com`;
  await page.goto("/account");
  await page.locator('[data-app-ready="true"]').waitFor();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.locator('[data-app-ready="true"]').waitFor();
  await page
    .getByRole("button", { name: "New to Scently? Create an account" })
    .click();
  await page.getByLabel("Display name").fill("Fragrance tester");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("A-new-browser-password-2026");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByText("Welcome, Fragrance tester.", { exact: false }),
  ).toBeVisible();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.user.admin).toBe(false);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await (await page.request.get("/api/me")).json()).user).toBeNull();
  await page.goto("/login?return_to=https://untrusted.example");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Email or password is incorrect",
  );
  await page
    .getByLabel("Password", { exact: true })
    .fill("A-new-browser-password-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  expect((await (await page.request.get("/api/me")).json()).user.id).toBe(
    me.user.id,
  );
});

test("forged platform headers and cross-site account mutations are rejected", async ({
  request,
}) => {
  const forged = await request.get("/api/me", {
    headers: {
      "oai-authenticated-user-id": "test-admin",
      "oai-authenticated-user-email": "admin@example.com",
    },
  });
  expect((await forged.json()).user).toBeNull();
  const cross = await request.post("/api/auth", {
    headers: { Origin: "https://untrusted.example" },
    data: { action: "logout" },
  });
  expect(cross.status()).toBe(403);
});
