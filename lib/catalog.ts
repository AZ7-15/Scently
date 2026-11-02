import { normalize, type Fragrance } from "./domain";
export function brandKey(brand: string) {
  const key = normalize(brand)
    .replace(/\bperfumes?\b/g, "")
    .trim();
  return key === "christian dior" ? "dior" : key;
}
export function fragranceKey(
  fragrance: Pick<Fragrance, "brand" | "name" | "concentration">,
) {
  return [
    brandKey(fragrance.brand),
    normalize(fragrance.name),
    normalize(fragrance.concentration),
  ].join("|");
}
export function mergeFragrances(local: Fragrance[], incoming: Fragrance[]) {
  const records = new Map(local.map((item) => [fragranceKey(item), item]));
  for (const item of incoming)
    if (!records.has(fragranceKey(item))) records.set(fragranceKey(item), item);
  return [...records.values()];
}
export function catalogFamily(value: string) {
  if (/wood|root/i.test(value)) return "woody";
  if (/smoke|leather|tobacco|dark/i.test(value)) return "dark";
  if (/sweet|amber|resin|spice/i.test(value)) return "warm";
  if (/bloom|petal|floral|flower/i.test(value)) return "floral";
  if (
    /fresh|citrus|orchard|fruit|green|water|marine|herbal|aromatic/i.test(value)
  )
    return "fresh";
  return "unknown";
}
