import { matchingCatalogEdition, photoConcentrationMatches } from "@/lib/catalog";
import type { ProductPhoto } from "@/lib/product-photos";
import { memoryLimit } from "./memory-limits";

type FragellaRecord = {
  Name?: unknown;
  Brand?: unknown;
  OilType?: unknown;
  "Image URL"?: unknown;
  "Image URL Transparent"?: unknown;
};

function providerImage(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "cdn.fragella.com" &&
      /^\/images\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(url.pathname) &&
      !url.username && !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}

export function photosFromFragella(
  payload: unknown,
  name: string,
  brand: string,
  concentration: string,
  excluded: string[] = [],
): ProductPhoto[] {
  const candidates = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" &&
        Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : [];
  for (const item of candidates.slice(0, 10)) {
    if (!item || typeof item !== "object") continue;
    const record = item as FragellaRecord;
    if (typeof record.Name !== "string" || typeof record.Brand !== "string") continue;
    const strength = typeof record.OilType === "string" ? record.OilType : "";
    if (!matchingCatalogEdition(
      { name, brand, concentration },
      { name: record.Name, brand: record.Brand, concentration: strength },
    )) continue;
    if (!photoConcentrationMatches(concentration, record.Name + " " + strength)) continue;
    const standard = providerImage(record["Image URL"]);
    if (!standard) continue;
    const transparent = providerImage(record["Image URL Transparent"]);
    const sourceUrl = "https://api.fragella.com/";
    const images = [
      ...(transparent &&
      transparent.pathname.replace(/\.[^.]+$/, "") ===
        standard.pathname.replace(/\.[^.]+$/, "")
        ? [transparent.href]
        : []),
      standard.href,
    ];
    return [...new Set(images)]
      .filter((url) => !excluded.includes(url))
      .map((url) => ({ url, sourceUrl }));
  }
  return [];
}

export async function fragellaPhotos(
  name: string,
  brand: string,
  concentration: string,
  excluded: string[] = [],
): Promise<ProductPhoto[]> {
  const key = process.env.FRAGELLA_API_KEY?.trim();
  if (!key) return [];
  const configuredLimit = Number(process.env.FRAGELLA_PHOTO_MONTHLY_LIMIT || 20);
  const limit = Number.isInteger(configuredLimit)
    ? Math.min(20_000, Math.max(1, configuredLimit))
    : 20;
  if (!memoryLimit("photo:fragella", limit, 30 * 24 * 3600)) return [];
  try {
    const url = new URL("https://api.fragella.com/api/v1/fragrances");
    url.search = new URLSearchParams({ search: name, limit: "10" }).toString();
    const response = await fetch(url, {
      headers: { "x-api-key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > 250_000)
      return [];
    const body = await response.text();
    if (body.length > 250_000) return [];
    return photosFromFragella(JSON.parse(body), name, brand, concentration, excluded);
  } catch {
    return [];
  }
}
