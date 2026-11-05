vi.mock("../lib/server/open-catalog", () => ({
  canonicalProductUrl: async () => null,
}));
import { afterEach, expect, it, vi } from "vitest";
import {
  photosFromPage,
  resolveProductPhotos,
} from "../lib/server/product-photos";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const source = "https://www.scento.com/perfumes/asad-lattafa";
const packShot = "https://imagedelivery.net/account/asad/public";
function page(name: string, brand: string, image: unknown) {
  return (
    '<script type="application/ld+json">' +
    JSON.stringify({
      "@type": "ProductGroup",
      name,
      brand: { name: brand },
      image,
    }) +
    "</script>"
  );
}
it("selects a product-specific pack shot and retains attribution", () => {
  const result = photosFromPage(
    page("Asad", "Lattafa", [
      "https://imagedelivery.net/account/asad/campaign",
      packShot,
    ]),
    "Asad",
    "Lattafa",
    source,
  );
  expect(result[0]).toEqual({ url: packShot, sourceUrl: source });
});
it("matches Kilian Paris to a Kilian retailer bottle without matching a flanker", () => {
  expect(photosFromPage(page("Kilian Angels' Share", "Kilian", packShot), "Angels' Share", "Kilian Paris", source, "Eau de Parfum")).toEqual([]);
  const withStrength = page("Kilian Angels' Share Eau de Parfum", "Kilian", packShot);
  expect(photosFromPage(withStrength, "Angels' Share", "Kilian Paris", source, "Eau de Parfum")).toEqual([
    { url: packShot, sourceUrl: source },
  ]);
  expect(photosFromPage(page("Kilian Angels' Share Paradis Eau de Parfum", "Kilian", packShot), "Angels' Share", "Kilian Paris", source, "Eau de Parfum")).toEqual([]);
});
it("uses the licensed photo fallback only for an exact source match", async () => {
  vi.stubEnv("FRAGELLA_API_KEY", "test-key");
  const image = "https://cdn.fragella.com/images/kilian-sacred-wood.jpg";
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://www.scento.com/brand/kilian")
      return new Response("<html></html>");
    if (url.startsWith("https://api.fragella.com/api/v1/fragrances?"))
      return Response.json([{
        Name: "Kilian Sacred Wood",
        Brand: "By Kilian",
        OilType: "Eau de Parfum",
        "Image URL": image,
      }]);
    throw Error("Unexpected external request: " + url);
  });
  vi.stubGlobal("fetch", fetcher);
  const result = await resolveProductPhotos(
    "Sacred Wood", "Kilian Paris", "https://www.scento.com/brand/kilian", "Eau de Parfum",
  );
  expect(result.images).toEqual([{ url: image, sourceUrl: "https://api.fragella.com/" }]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("rejects other flankers, other brands, brand covers, and untrusted images", () => {
  expect(
    photosFromPage(
      page("Asad Zanzibar", "Lattafa", packShot),
      "Asad",
      "Lattafa",
      source,
    ),
  ).toEqual([]);
  expect(
    photosFromPage(
      page("Asad", "Another brand", packShot),
      "Asad",
      "Lattafa",
      source,
    ),
  ).toEqual([]);
  expect(
    photosFromPage(
      '<meta property="og:image" content="' + packShot + '">',
      "Asad",
      "Lattafa",
      source,
    ),
  ).toEqual([]);
  expect(
    photosFromPage(
      page("Asad", "Lattafa", "http://127.0.0.1/private"),
      "Asad",
      "Lattafa",
      source,
    ),
  ).toEqual([]);
});
it("reads an exact bottle label on a brand page without confusing flankers", () => {
  const nextImage = "/_next/image?" + new URLSearchParams({ url: packShot });
  const html = `<img alt="Lattafa Asad Zanzibar perfume bottle - luxury fragrance" src="${nextImage}"><img alt="Lattafa Asad perfume bottle - luxury fragrance" src="${nextImage}">`;
  expect(photosFromPage(html, "Asad", "Lattafa", source)).toEqual([
    { url: packShot, sourceUrl: source },
  ]);
});
it("uses a matching brand product fallback and rejects untrusted image hosts", async () => {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url === "https://www.scento.com/brand/lattafa")
      return new Response("<html></html>");
    if (url === "https://www.lattafaindia.com/products/raed-silver.js")
      return Response.json({
        title: "Raed Silver",
        vendor: "Lattafa India",
        images: [
          "https://cdn.shopify.com/raed-silver.jpg",
          "https://untrusted.example/wrong.jpg",
        ],
      });
    throw new Error("Unexpected upstream request");
  });
  vi.stubGlobal("fetch", fetcher);
  const result = await resolveProductPhotos(
    "Ra'ed Silver",
    "Lattafa",
    "https://www.scento.com/brand/lattafa",
  );
  expect(result.images).toEqual([
    {
      url: "https://cdn.shopify.com/raed-silver.jpg",
      sourceUrl: "https://www.lattafaindia.com/products/raed-silver",
    },
  ]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it.each([
  ["Sauvage", "Dior"],
  ["Bleu de Chanel", "Chanel"],
  ["Naxos", "Xerjoff"],
  ["Layton", "Parfums de Marly"],
  ["Voyage", "Nautica"],
  ["9PM", "Afnan"],
  ["Club de Nuit Intense Man", "Armaf"],
  ["Hawas", "Rasasi"],
])("validates brand, flanker and concentration for %s by %s", (name, brand) => {
  const html = page(name, brand, packShot);
  expect(photosFromPage(html, name, brand, source)).toHaveLength(1);
  expect(photosFromPage(html, name + " Intense", brand, source)).toEqual([]);
  expect(photosFromPage(html, name, "Another house", source)).toEqual([]);
  expect(photosFromPage(html, name, brand, source, "EDP")).toEqual([]);
  const described = html.replace(
    '"@type":"ProductGroup"',
    '"description":"Eau de Parfum","@type":"ProductGroup"',
  );
  expect(photosFromPage(described, name, brand, source, "EDP")).toHaveLength(1);
  expect(photosFromPage(described, name, brand, source, "EDT")).toEqual([]);
  expect(photosFromPage(described, name, brand, source, "Parfum")).toEqual([]);
});
it("rejects ambiguous concentration evidence and wrong brand alt labels", () => {
  const html = page("Bleu de Chanel", "Chanel", packShot).replace(
    '"@type":"ProductGroup"',
    '"description":"EDT and EDP","@type":"ProductGroup"',
  );
  expect(
    photosFromPage(html, "Bleu de Chanel", "Chanel", source, "EDP"),
  ).toEqual([]);
  expect(
    photosFromPage(
      '<img alt="Another house Asad perfume bottle" src="' + packShot + '">',
      "Asad",
      "Lattafa",
      source,
    ),
  ).toEqual([]);
});

it("reads an attributed bottle from matched source product metadata using the catalog's aliases", () => {
  const html =
    "<script>self.__next_f.push(" +
    JSON.stringify([
      1,
      JSON.stringify({
        product: {
          id: "prod_photo",
          title: "Emporio Armani Stronger With You Intensely",
          brand: { name: "Giorgio Armani" },
          thumbnail: packShot,
          metadata: { concentration: "EDP" },
        },
      }),
    ]) +
    ")</script>";
  expect(
    photosFromPage(
      html,
      "Stronger With You Intensely",
      "Giorgio Armani",
      source,
      "EDP",
    ),
  ).toEqual([{ url: packShot, sourceUrl: source }]);
  expect(
    photosFromPage(
      html,
      "Stronger With You Absolutely",
      "Giorgio Armani",
      source,
      "EDP",
    ),
  ).toEqual([]);
  expect(
    photosFromPage(
      html,
      "Stronger With You Intensely",
      "Giorgio Armani",
      source,
      "EDT",
    ),
  ).toEqual([]);
});
it("accepts the actual manufacturer's image host while still rejecting unrelated hosts", () => {
  const url = "https://www.lattafaindia.com/cdn/shop/files/asad.jpg";
  expect(
    photosFromPage(page("Asad", "Lattafa", url), "Asad", "Lattafa", source),
  ).toEqual([{ url, sourceUrl: source }]);
});

it("tries a different source when the browser reports that the matched image is broken", async () => {
  const sourceUrl = "https://www.scento.com/perfumes/asad-broken-test";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url === sourceUrl)
        return new Response(page("Asad", "Lattafa", packShot));
      if (url === "https://www.lattafaindia.com/products/asad.js")
        return Response.json({
          title: "Asad",
          vendor: "Lattafa India",
          images: [
            "https://www.lattafaindia.com/cdn/shop/files/asad-alternate.jpg",
          ],
        });
      throw Error("Unexpected request");
    }),
  );
  const result = await resolveProductPhotos(
    "Asad",
    "Lattafa",
    sourceUrl,
    "",
    false,
    [packShot],
  );
  expect(result.images.map((i) => i.url)).toEqual([
    "https://www.lattafaindia.com/cdn/shop/files/asad-alternate.jpg",
  ]);
});
