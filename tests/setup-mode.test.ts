import { afterEach, it, expect, vi } from "vitest";
vi.mock("@/db/runtime", () => ({
  env: {
    get DB() {
      throw new Error("Unexpected database access");
    },
  },
}));
import { databaseConfigured } from "../lib/server/configuration";
import { getCatalog, getReviews } from "../lib/server/catalog";
import { requireUser, limited } from "../lib/server/security";
import { GET as health } from "../app/api/health/route";
afterEach(() => vi.unstubAllEnvs());
it("keeps Render browsing available while refusing account writes without secrets", async () => {
  vi.stubEnv("RENDER", "true");
  vi.stubEnv("TURSO_DATABASE_URL", "");
  vi.stubEnv("TURSO_AUTH_TOKEN", "");
  expect(databaseConfigured()).toBe(false);
  expect(await getCatalog()).toHaveLength(6);
  expect(await getReviews()).toEqual([]);
  await expect(requireUser()).rejects.toMatchObject({ status: 503 });
  expect(await (await health()).json()).toMatchObject({
    mode: "browse-only",
    database: "not_configured",
  });
  await limited("setup-unit", 1, 60);
  await expect(limited("setup-unit", 1, 60)).rejects.toMatchObject({
    status: 429,
  });
});
