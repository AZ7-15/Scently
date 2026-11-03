import { expect, it } from "vitest";
import { enrichProfile } from "../lib/server/fragrance-editorial";
import type { LiveProfile } from "../lib/live-catalog";
const profile: LiveProfile = {
  name: "Le Male Elixir",
  brand: "Jean Paul Gaultier",
  year: null,
  perfumer: null,
  concentration: "elixir",
  family: "Velvet Sweet",
  subfamily: null,
  description: "Short description",
  pyramid: { top: ["Lavender"], heart: ["Tonka Bean"], base: ["Benzoin"] },
  notes: [],
  seasons: ["winter"],
  sourceUrl:
    "https://www.scento.com/perfumes/le-male-elixir-jean-paul-gaultier",
  source: "Scento",
  checkedAt: "2026-11-03",
};
function markup(product: Record<string, unknown>) {
  return (
    "<script>self.__next_f.push(" +
    JSON.stringify([1, JSON.stringify({ product })]) +
    ")</script>"
  );
}
const product = {
  id: "prod_test",
  title: profile.name,
  brand: { name: profile.brand },
  thumbnail: "https://imagedelivery.net/account/elixir/public",
  description: "A source description.",
  metadata: { launch_year: 2023 },
  product_notes: [
    { note_type: "top", note: { name: "Lavender" } },
    { note_type: "top", note: { name: "Mint" } },
    { note_type: "heart", note: { name: "Vanilla" } },
    { note_type: "heart", note: { name: "Benzoin" } },
    { note_type: "base", note: { name: "Honey" } },
    { note_type: "base", note: { name: "Tonka Bean" } },
    { note_type: "base", note: { name: "Tobacco" } },
  ],
};
it("uses the matching product's fuller pyramid and pack shot without inventing community data", () => {
  const result = enrichProfile(profile, markup(product));
  expect(result.detailed).toBe(true);
  expect(result.pyramid.heart).toEqual(["Vanilla", "Benzoin"]);
  expect(result.pyramid.base).toEqual(["Honey", "Tonka Bean", "Tobacco"]);
  expect(result.imageUrl).toBe(product.thumbnail);
  expect(result.year).toBe(2023);
  expect(result).not.toHaveProperty("rating");
});
it("rejects another flanker or brand and retains the original profile on malformed source pages", () => {
  for (const candidate of [
    { ...product, title: "Le Male Elixir Absolu" },
    { ...product, brand: { name: "Another house" } },
  ]) {
    const result = enrichProfile(profile, markup(candidate));
    expect(result.detailed).toBe(false);
    expect(result.imageUrl).toBeNull();
    expect(result.pyramid).toEqual(profile.pyramid);
  }
  expect(enrichProfile(profile, "<html>unavailable</html>").description).toBe(
    profile.description,
  );
});
it("rejects untrusted or campaign images and does not assign unknown note stages", () => {
  const result = enrichProfile(
    profile,
    markup({
      ...product,
      thumbnail: "https://untrusted.example/bottle.jpg",
      product_notes: [
        ...product.product_notes,
        { note_type: "signature", note: { name: "Amber" } },
      ],
    }),
  );
  expect(result.imageUrl).toBeNull();
  expect(result.notes).toEqual(["Amber"]);
  expect(result.pyramid.base).not.toContain("Amber");
  expect(
    enrichProfile(
      profile,
      markup({
        ...product,
        thumbnail: "https://imagedelivery.net/account/elixir/campaign",
      }),
    ).imageUrl,
  ).toBeNull();
});
