import { normalize } from "@/lib/domain";
import {
  brandKey,
  identityName,
  sameFragrance,
  photoConcentrationMatches,
} from "@/lib/catalog";
import type { ProductPhoto, ProductPhotoResult } from "@/lib/product-photos";
import { getLiveFragrance } from "./scento";
import { memoryLimit } from "./memory-limits";

const pages = new Map<string, Promise<string>>();
const photos = new Map<
  string,
  { result: ProductPhotoResult; expires: number }
>();
const pending = new Map<string, Promise<ProductPhotoResult>>();
const cdnHosts = new Set([
  "imagedelivery.net",
  "cdn.shopify.com",
  "www.scento.com",
]);
function safeImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    let url = new URL(value, "https://www.scento.com");
    if (
      url.origin === "https://www.scento.com" &&
      url.pathname === "/_next/image"
    )
      url = new URL(url.searchParams.get("url") || "");
    return url.protocol === "https:" &&
      cdnHosts.has(url.hostname) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)));
}
function photoName(value: string) {
  return identityName(value);
}
function productLabel(value: string, brand: string) {
  let label = photoName(value);
  for (const token of photoName(brand).split(" ").filter(Boolean))
    label = label.replace(new RegExp("\\b" + token + "\\b", "g"), " ");
  return label
    .replace(
      /\b(eau de parfum|eau de toilette|eau de cologne|extrait de parfum|perfume bottle|perfume|perfumes|parfum spray|spray|bottle|luxury fragrance|luxury|fragrance|by)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}
export function photosFromPage(
  html: string,
  name: string,
  brand: string,
  sourceUrl: string,
  concentration = "",
): ProductPhoto[] {
  const images: string[] = [];
  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const productBrand =
      typeof record.brand === "object" && record.brand
        ? (record.brand as Record<string, unknown>).name
        : record.brand;
    if (
      ["ProductGroup", "Product"].includes(String(record["@type"])) &&
      photoName(String(record.name)) === photoName(name) &&
      typeof productBrand === "string" &&
      brandKey(productBrand) === brandKey(brand) &&
      photoConcentrationMatches(
        concentration,
        String(record.name) + " " + String(record.description || ""),
      )
    ) {
      const candidates = Array.isArray(record.image)
        ? record.image
        : [record.image];
      for (const candidate of candidates) {
        const image = safeImage(
          typeof candidate === "object" && candidate
            ? (candidate as Record<string, unknown>).url
            : candidate,
        );
        if (image) images.push(image);
      }
    }
    for (const child of Object.values(record))
      if (child && typeof child === "object") {
        if (Array.isArray(child)) child.forEach(visit);
        else visit(child);
      }
  }
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      /* Ignore unrelated or invalid schema. */
    }
  }
  // Brand pages list bottle photographs with product-specific alt labels.
  if (!images.length)
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const alt = match[0].match(/\balt="([^"]*)"/i)?.[1];
      if (
        !alt ||
        !/bottle/i.test(alt) ||
        !photoName(decode(alt)).includes(photoName(brand)) ||
        !photoConcentrationMatches(concentration, decode(alt)) ||
        productLabel(decode(alt), brand) !== productLabel(name, brand)
      )
        continue;
      const src = match[0].match(/\bsrc="([^"]*)"/i)?.[1];
      const image = safeImage(src ? decode(src) : "");
      if (image) images.push(image);
    }
  // Prefer plain pack shots to campaign artwork when both identify the product.
  return [...new Set(images)]
    .sort(
      (a, b) =>
        Number(a.includes("/campaign")) - Number(b.includes("/campaign")),
    )
    .slice(0, 4)
    .map((url) => ({ url, sourceUrl }));
}
async function pageHtml(url: string) {
  const existing = pages.get(url);
  if (existing) return existing;
  if (!memoryLimit("photo:pages", 80, 60)) return "";
  const promise = (async () => {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "text/html" },
        redirect: "error",
      });
      if (!response.ok) return "";
      const body = await response.text();
      return body.length <= 2_000_000 ? body : "";
    } catch {
      return "";
    }
  })();
  if (pages.size >= 64) pages.delete(pages.keys().next().value!);
  pages.set(url, promise);
  // Keep page markup briefly; image metadata is cached independently.
  setTimeout(
    () => {
      if (pages.get(url) === promise) pages.delete(url);
    },
    15 * 60 * 1000,
  ).unref();
  return promise;
}
async function retailerPhoto(
  name: string,
  brand: string,
  concentration: string,
): Promise<ProductPhoto[]> {
  const stores = [
    "https://fragrancelord.com",
    "https://www.decantx.com",
    "https://www.scentdecant.com",
  ];
  for (const store of stores) {
    if (!memoryLimit("photo:retailers", 60, 60)) return [];
    try {
      const url = new URL("/search/suggest.json", store);
      url.search = new URLSearchParams({
        q: name,
        "resources[type]": "product",
        "resources[limit]": "10",
        "resources[options][fields]": "title",
      }).toString();
      const response = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        redirect: "error",
      });
      if (!response.ok) continue;
      const data = (await response.json()) as {
        resources?: {
          results?: {
            products?: {
              title: string;
              vendor: string;
              url: string;
              image?: string;
              featured_image?: { url?: string };
            }[];
          };
        };
      };
      for (const product of data.resources?.results?.products || []) {
        if (
          typeof product.title !== "string" ||
          typeof product.vendor !== "string" ||
          brandKey(product.vendor) !== brandKey(brand) ||
          !photoConcentrationMatches(concentration, product.title) ||
          productLabel(product.title, brand) !== productLabel(name, brand)
        )
          continue;
        const image = safeImage(product.featured_image?.url || product.image);
        const sourceUrl = new URL(product.url, store);
        if (image && sourceUrl.origin === store)
          return [
            { url: image, sourceUrl: sourceUrl.origin + sourceUrl.pathname },
          ];
      }
    } catch {
      /* Try the next public product-search source. */
    }
  }
  return [];
}
async function brandPhoto(
  name: string,
  brand: string,
  concentration: string,
): Promise<ProductPhoto[]> {
  if (brandKey(brand) !== "lattafa" || !memoryLimit("photo:brand", 30, 60))
    return [];
  const sourceUrl =
    "https://www.lattafaindia.com/products/" +
    photoName(name).replace(/\s+/g, "-");
  try {
    const response = await fetch(sourceUrl + ".js", {
      signal: AbortSignal.timeout(6000),
      redirect: "error",
    });
    if (!response.ok) return [];
    const product = (await response.json()) as {
      title?: string;
      vendor?: string;
      images?: string[];
      body_html?: string;
    };
    if (
      !product.title ||
      photoName(product.title) !== photoName(name) ||
      !photoConcentrationMatches(
        concentration,
        product.title + " " + (product.body_html || ""),
      ) ||
      !["lattafa", "lattafa india"].includes(normalize(product.vendor || ""))
    )
      return [];
    return (product.images || [])
      .map(safeImage)
      .filter((url): url is string => !!url)
      .slice(0, 3)
      .map((url) => ({ url, sourceUrl }));
  } catch {
    return [];
  }
}
export async function resolveProductPhotos(
  name: string,
  brand: string,
  source: string,
  concentration = "",
): Promise<ProductPhotoResult> {
  const key = [normalize(name), brandKey(brand), concentration, source].join(
    "|",
  );
  const cached = photos.get(key);
  if (cached && cached.expires > Date.now()) return cached.result;
  if (pending.has(key)) return pending.get(key)!;
  if (pending.size >= 16) return { images: [] };
  const task = (async () => {
    let sourceUrl: URL | null = null;
    try {
      const url = new URL(source);
      if (
        url.origin === "https://www.scento.com" &&
        /^\/(perfumes|brand)\/[a-z0-9-]+\/?$/.test(url.pathname)
      )
        sourceUrl = url;
    } catch {
      /* A provider profile may locate the canonical public page. */
    }
    if (!sourceUrl) {
      const profile = await getLiveFragrance(name + " " + brand).catch(
        () => null,
      );
      if (profile && sameFragrance({ name, brand, concentration }, profile))
        sourceUrl = new URL(profile.sourceUrl);
    }
    let images = sourceUrl
      ? photosFromPage(
          await pageHtml(sourceUrl.href),
          name,
          brand,
          sourceUrl.href,
          concentration,
        )
      : [];
    if (!images.length) images = await brandPhoto(name, brand, concentration);
    if (!images.length)
      images = await retailerPhoto(name, brand, concentration);
    const result = { images };
    if (photos.size >= 512) photos.delete(photos.keys().next().value!);
    photos.set(key, {
      result,
      expires: Date.now() + (images.length ? 7 * 24 * 3600000 : 5 * 60000),
    });
    return result;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
