import { afterEach, expect, it, vi } from "vitest";
import bundled from "../data/scento-open-catalog.json";
import { mapOpenCatalog } from "../lib/server/open-catalog";
import { mergeFragrances } from "../lib/catalog";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("maps every published record without inventing pictures, ratings, prices or dates", () => {
  const records = mapOpenCatalog(bundled);
  expect(records).toHaveLength(1479);
  expect(records.filter((f) => f.brand === "Armaf")).toHaveLength(189);
  expect(records.filter((f) => f.brand === "Afnan")).toHaveLength(53);
  expect(
    records.every(
      (f) => f.rating === null && f.imageUrl === null && f.offers.length === 0,
    ),
  ).toBe(true);
  expect(records.every((f) => f.checkedAt.startsWith("2026-10-29"))).toBe(true);
});
it("keeps flankers and concentration editions distinct", () => {
  const original = bundled[0];
  const records = mapOpenCatalog([
    {
      ...original,
      id: "original-edp",
      name: "Test scent",
      concentration: "eau-de-parfum",
    },
    {
      ...original,
      id: "original-edt",
      name: "Test scent",
      concentration: "eau-de-toilette",
    },
    {
      ...original,
      id: "intense-edp",
      name: "Test scent Intense",
      concentration: "eau-de-parfum",
    },
  ]);
  expect(mergeFragrances([], records)).toHaveLength(3);
});
it("coalesces refresh requests and keeps the licensed bundle when updates fail", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
  );
  const { getOpenCatalog, getOpenProfile } =
    await import("../lib/server/open-catalog");
  const [a, b] = await Promise.all([getOpenCatalog(), getOpenCatalog()]);
  expect(a).toEqual(b);
  expect(a).toHaveLength(1479);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect((await getOpenProfile("open:armaf-club-de-nuit-precieux"))?.name).toBe(
    "Club de Nuit Precieux",
  );
  expect(await getOpenProfile("open:unknown-record")).toBeNull();
});
