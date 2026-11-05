import { brandKey, catalogNameKey, identityName, photoConcentrationMatches } from "@/lib/catalog";
import type { ProductPhoto } from "@/lib/product-photos";

type BeautyProduct = {
  code?: unknown;
  product_name?: unknown;
  brands?: unknown;
  image_front_url?: unknown;
};

function productKey(value: string, brand: string) {
  return catalogNameKey(
    identityName(value)
      .replace(/\b\d+(?:\.\d+)?\s*(?:ml|fl\.?\s*oz|oz)\b/gi, " ")
      .replace(/\b(eau de parfum|eau de toilette|eau de cologne|edp|edt|edc|perfume|perfumes|spray|bottle|fragrance)\b/g, " ")
      .replace(/\s+/g, " ").trim(),
    brand,
  );
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "images.openbeautyfacts.org" &&
      /^\/images\/products\/[\d/]+\/front_[a-z]{2}\.\d+\.400\.(?:jpe?g|png|webp)$/i.test(url.pathname) &&
      !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function openBeautySearchUrl(name: string, brand: string) {
  const url = new URL("https://world.openbeautyfacts.org/cgi/search.pl");
  url.search = new URLSearchParams({
    search_terms: brand + " " + name,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,image_front_url",
  }).toString();
  return url;
}

export function photosFromOpenBeautyFacts(
  payload: unknown,
  name: string,
  brand: string,
  concentration: string,
  excluded: string[] = [],
): ProductPhoto[] {
  if (!payload || typeof payload !== "object") return [];
  const products = (payload as { products?: unknown }).products;
  if (!Array.isArray(products)) return [];
  for (const item of products.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const product = item as BeautyProduct;
    if (
      typeof product.code !== "string" || !/^\d{8,14}$/.test(product.code) ||
      typeof product.product_name !== "string" ||
      typeof product.brands !== "string" ||
      !product.brands.split(/[,;]/).some((entry) => brandKey(entry) === brandKey(brand)) ||
      productKey(product.product_name, brand) !== productKey(name, brand) ||
      !photoConcentrationMatches(concentration, product.product_name)
    ) continue;
    const url = imageUrl(product.image_front_url);
    if (url && !excluded.includes(url))
      return [{ url, sourceUrl: `https://world.openbeautyfacts.org/product/${product.code}` }];
  }
  return [];
}
