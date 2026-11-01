import { it, expect, vi } from "vitest";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import {
  hashPassword,
  verifyPassword,
  safeReturnPath,
} from "../lib/server/session";
it("salts password hashes and rejects incorrect credentials", async () => {
  const first = await hashPassword("test-password-12345"),
    second = await hashPassword("test-password-12345");
  expect(first).not.toBe(second);
  expect(await verifyPassword("test-password-12345", first)).toBe(true);
  expect(await verifyPassword("wrong-password", first)).toBe(false);
});
it("keeps sign-in redirects inside the site", () => {
  for (const path of [
    "https://bad.example",
    "//bad.example",
    "/\\bad.example",
    "/api/auth",
    "/login",
  ])
    expect(safeReturnPath(path)).toBe("/account");
  expect(safeReturnPath("/fragrances?q=vanilla#results")).toBe(
    "/fragrances?q=vanilla#results",
  );
});
