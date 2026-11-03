import { canonicalProductUrl } from "./open-catalog";
import { productFromMarkup, sourceMarkup } from "./fragrance-editorial";
import { normalize } from "@/lib/domain";
import {
  brandKey,
  identityName,
  sameFragrance,
  matchingCatalogEdition,
  catalogNameKey,
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
  "www.lattafaindia.com",
  "lattafaindia.com",
  "fragrancelord.com",
  "www.fragrancelord.com",
  "www.decantx.com",
  "decantx.com",
  "www.scentdecant.com",
  "scentdecant.com",
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
  const label = value.replace(
    /\b\d+(?:\.\d+)?\s*(?:ml|fl\.?\s*oz|oz)\b/gi,
    " ",
  );
  return catalogNameKey(
    identityName(label)
      .replace(
        /\b(eau de parfum|eau de toilette|eau de cologne|perfume bottle|perfume|perfumes|spray|bottle|luxury fragrance|luxury|fragrance|by)\b/g,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim(),
    brand,
  );
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
      typeof record.name === "string" &&
      typeof productBrand === "string" &&
      sameFragrance(
        { name, brand },
        { name: record.name as string, brand: productBrand },
      ) &&
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
  const product = productFromMarkup(html);
  if (product && typeof product.title === "string") {
    const house =
      product.brand && typeof product.brand === "object"
        ? (product.brand as Record<string, unknown>).name
        : product.subtitle;
    const metadata =
      product.metadata && typeof product.metadata === "object"
        ? (product.metadata as Record<string, unknown>)
        : {};
    if (
      typeof house === "string" &&
      matchingCatalogEdition(
        { name, brand, concentration },
        {
          name: product.title,
          brand: house,
          concentration:
            typeof metadata.concentration === "string"
              ? metadata.concentration
              : "",
        },
      )
    ) {
      const image = safeImage(product.thumbnail);
      if (image && !image.includes("/campaign")) images.unshift(image);
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
  const location = new URL(url);
  if (
    location.origin === "https://www.scento.com" &&
    /^\/perfumes\/[a-z0-9-]+$/.test(location.pathname)
  )
    return sourceMarkup(location.pathname);
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
  excluded: string[] = [],
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
        const rawImage = product.featured_image?.url || product.image;
        const image = rawImage
          ? safeImage(new URL(rawImage, store).href)
          : null;
        const sourceUrl = new URL(product.url, store);
        if (image && !excluded.includes(image) && sourceUrl.origin === store)
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
      .map((image) => safeImage(new URL(image, sourceUrl).href))
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
  retry = false,
  excluded: string[] = [],
): Promise<ProductPhotoResult> {
  const key = [
    normalize(name),
    brandKey(brand),
    concentration,
    source,
    ...excluded,
  ].join("|");
  const cached = photos.get(key);
  if (
    cached &&
    cached.expires > Date.now() &&
    !(retry && !cached.result.images.length)
  )
    return cached.result;
  if (pending.has(key)) return pending.get(key)!;
  if (pending.size >= 16) return { images: [], retryAfter: 2 };
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
      const indexed = await canonicalProductUrl({ name, brand, concentration });
      if (indexed) sourceUrl = new URL(indexed);
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
    images = images.filter((image) => !excluded.includes(image.url));
    if (!images.length)
      images = (await brandPhoto(name, brand, concentration)).filter(
        (image) => !excluded.includes(image.url),
      );
    if (!images.length)
      images = await retailerPhoto(name, brand, concentration, excluded);
    const result = { images };
    if (photos.size >= 512) photos.delete(photos.keys().next().value!);
    photos.set(key, {
      result,
      expires: Date.now() + (images.length ? 7 * 24 * 3600000 : 30000),
    });
    return result;
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
