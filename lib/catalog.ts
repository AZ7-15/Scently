import { normalize, type Fragrance } from "./domain";
export function brandKey(brand: string) {
  const key = identityName(brand)
    .replace(/\bperfumes?\b/g, "")
    .trim();
  return key === "christian dior" ? "dior" : key;
}
export function identityName(value: string) {
  return normalize(value)
    .replace(/[\u2019']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function concentrationKey(value: string | null | undefined) {
  const text = identityName(value || "");
  if (/\b(extrait de parfum|extrait|extract)\b/.test(text)) return "extrait";
  if (/\b(eau de parfum|edp)\b/.test(text)) return "edp";
  if (/\b(eau de toilette|edt)\b/.test(text)) return "edt";
  if (/\b(eau de cologne|edc)\b/.test(text)) return "edc";
  if (/\bparfum\b/.test(text)) return "parfum";
  if (/\belixir\b/.test(text)) return "elixir";
  return "";
}
export function sameFragrance(
  expected: { name: string; brand: string; concentration?: string | null },
  actual: { name: string; brand: string; concentration?: string | null },
) {
  const concentration = concentrationKey(expected.concentration);
  return (
    identityName(expected.name) === identityName(actual.name) &&
    brandKey(expected.brand) === brandKey(actual.brand) &&
    (!concentration || concentration === concentrationKey(actual.concentration))
  );
}
export function photoConcentrationMatches(expected: string, evidence: string) {
  const wanted = concentrationKey(expected);
  if (!wanted) return true;
  const mentions =
    identityName(evidence).match(
      /\b(extrait de parfum|extrait|extract|eau de parfum|edp|eau de toilette|edt|eau de cologne|edc|parfum|elixir)\b/g,
    ) || [];
  const found = new Set(mentions.map(concentrationKey));
  return found.size === 1 && found.has(wanted);
}
export function fragranceKey(
  fragrance: Pick<Fragrance, "brand" | "name" | "concentration">,
) {
  return [
    brandKey(fragrance.brand),
    identityName(fragrance.name),
    concentrationKey(fragrance.concentration) ||
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
