import { afterEach, expect, it, vi } from "vitest";
import {
  photosFromPage,
  resolveProductPhotos,
} from "../lib/server/product-photos";
afterEach(() => vi.unstubAllGlobals());
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
