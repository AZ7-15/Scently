import { expect, it } from "vitest";
import { photosFromOpenBeautyFacts } from "../lib/server/open-beauty-photos";

const image = "https://images.openbeautyfacts.org/images/products/629/110/873/7194/front_fr.6.400.jpg";
const product = {
  code: "6291108737194",
  product_name: "Lattafa Khamrah - Eau de Parfum 100ml",
  brands: "Lattafa",
  image_front_url: image,
};

it("accepts an exact free product photo with its product-page credit", () => {
  expect(photosFromOpenBeautyFacts({ products: [product] }, "Khamrah", "Lattafa", "Eau de Parfum")).toEqual([
    { url: image, sourceUrl: "https://world.openbeautyfacts.org/product/6291108737194" },
  ]);
  expect(photosFromOpenBeautyFacts({ products: [product] }, "Khamrah", "Lattafa", "Eau de Parfum", [image])).toEqual([]);
});

it("rejects another flanker, strength, brand and image host", () => {
  expect(photosFromOpenBeautyFacts({ products: [{ ...product, product_name: "Lattafa Khamrah Qahwa Eau de Parfum" }] }, "Khamrah", "Lattafa", "Eau de Parfum")).toEqual([]);
  expect(photosFromOpenBeautyFacts({ products: [product] }, "Khamrah", "Lattafa", "Eau de Toilette")).toEqual([]);
  expect(photosFromOpenBeautyFacts({ products: [{ ...product, brands: "Another house" }] }, "Khamrah", "Lattafa", "Eau de Parfum")).toEqual([]);
  expect(photosFromOpenBeautyFacts({ products: [{ ...product, image_front_url: "https://example.com/bottle.jpg" }] }, "Khamrah", "Lattafa", "Eau de Parfum")).toEqual([]);
});

it("handles an abbreviated brand label without confusing the fragrance edition", () => {
  const bottle = "https://images.openbeautyfacts.org/images/products/843/541/501/2669/front_en.7.400.jpg";
  expect(photosFromOpenBeautyFacts({ products: [{
    code: "8435415012669",
    product_name: "J.P. Gaultier Le Male - Eau de Toilette 125 ml",
    brands: "Jean Paul Gaultier",
    image_front_url: bottle,
  }] }, "Le Male", "Jean Paul Gaultier", "Eau de Toilette")).toEqual([
    { url: bottle, sourceUrl: "https://world.openbeautyfacts.org/product/8435415012669" },
  ]);
});
