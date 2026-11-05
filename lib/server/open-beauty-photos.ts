import { openBeautySearchUrl, photosFromOpenBeautyFacts } from "@/lib/open-beauty-photos";
import type { ProductPhoto } from "@/lib/product-photos";
import { memoryLimit } from "./memory-limits";

export { photosFromOpenBeautyFacts } from "@/lib/open-beauty-photos";

export async function openBeautyPhotos(
  name: string,
  brand: string,
  concentration: string,
  excluded: string[] = [],
): Promise<ProductPhoto[]> {
  if (!memoryLimit("photo:open-beauty", 30, 60)) return [];
  try {
    const response = await fetch(openBeautySearchUrl(name, brand), {
      headers: {
        Accept: "application/json",
        "User-Agent": `Scently/1.0 (${process.env.CONTACT_EMAIL || "https://scently.onrender.com"})`,
      },
      signal: AbortSignal.timeout(7000),
      redirect: "error",
    });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > 250_000)
      return [];
    const body = await response.text();
    if (body.length > 250_000) return [];
    return photosFromOpenBeautyFacts(JSON.parse(body), name, brand, concentration, excluded);
  } catch {
    return [];
  }
}
