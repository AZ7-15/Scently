import { afterEach, expect, it, vi } from "vitest";
import bundled from "../data/scento-open-catalog.json";
import { mapOpenCatalog } from "../lib/server/open-catalog";
import { mergeFragrances } from "../lib/catalog";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("maps published records with verified photos and without invented ratings or prices", () => {
  const records = mapOpenCatalog(bundled);
  expect(records).toHaveLength(1479);
  expect(records.filter((f) => f.brand === "Armaf")).toHaveLength(189);
  expect(records.filter((f) => f.brand === "Afnan")).toHaveLength(53);
  expect(records.every((f) => f.rating === null && f.offers.length === 0)).toBe(true);
  expect(records.find((f) => f.slug === "kilian-angels-share")?.imageUrl).toBe(
    "/images/products/kilian-angels-share.png",
  );
  expect(records.find((f) => f.slug === "creed-aventus")?.imageUrl).toMatch(
    /^https:\/\/cdn\.shopify\.com\//,
  );
  expect(records.find((f) => f.slug === "kilian-dark-lord")?.imageUrl).toBeNull();
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

it("audits the full published snapshot for known duplicate names", () => {
  const merged = mergeFragrances([], mapOpenCatalog(bundled));
  for (const [brand, fragment] of [
    ["Giorgio Armani", "stronger with you absolutely"],
    ["Maison Margiela Fragrances", "by the fireplace"],
    ["Maison Margiela Fragrances", "jazz club"],
    ["Maison Margiela Fragrances", "beach walk"],
    ["Le Labo", "noir 29"],
    ["Jean Paul Gaultier", "divine"],
  ]) {
    const matches = merged.filter(
      (f) =>
        f.brand === brand &&
        (f.name.toLowerCase().endsWith(fragment) ||
          f.name.toLowerCase() === fragment + " givenchy"),
    );
    expect(matches, brand + ": " + fragment).toHaveLength(1);
  }
  expect(merged.some((f) => f.name === "Absolu Aventus")).toBe(true);
  expect(merged.some((f) => f.name === "Aventus")).toBe(true);
});

it("locates a product page through a known alias without substituting another flanker", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })),
  );
  const { canonicalProductUrl } = await import("../lib/server/open-catalog");
  expect(
    await canonicalProductUrl({
      name: "Stronger With You Absolutely",
      brand: "Giorgio Armani",
      concentration: "Parfum",
    }),
  ).toBe(
    "https://www.scento.com/perfumes/emporio-armani-stronger-with-you-absolutely-giorgio-armani",
  );
  expect(
    await canonicalProductUrl({
      name: "Stronger With You Absolutely Intense",
      brand: "Giorgio Armani",
      concentration: "Parfum",
    }),
  ).toBeNull();
});
