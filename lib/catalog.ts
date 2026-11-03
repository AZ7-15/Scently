import { normalize, type Fragrance } from "./domain";
export function brandKey(brand: string) {
  const key = identityName(brand)
    .replace(/\bperfumes?\b/g, "")
    .trim();
  if (key === "maison margiela fragrances") return "maison margiela";
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
  if (/\b(eau de cologne|cologne|edc)\b/.test(text)) return "edc";
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
type CatalogIdentity = Pick<Fragrance, "brand" | "name" | "concentration">;
function editionName(fragrance: CatalogIdentity) {
  return identityName(fragrance.name.replace(/&/g, " and "))
    .replace(
      /\s+(?:eau de parfum|eau de toilette|eau de cologne|edp|edt|edc)$/,
      "",
    )
    .replace(/\s+/g, "");
}
function editionConcentration(f: CatalogIdentity) {
  const explicit =
    concentrationKey(f.concentration) ||
    concentrationKey(
      f.name.match(
        /(?:eau de parfum|eau de toilette|eau de cologne|edp|edt|edc)$/i,
      )?.[0],
    );
  // Elixir in a product name is an edition label, not a separate strength.
  if (explicit === "elixir" && /\belixir\b/.test(identityName(f.name)))
    return "";
  const raw = identityName(f.concentration || "");
  return (
    explicit ||
    (["", "not provided", "unknown", "n a", "not specified"].includes(raw)
      ? ""
      : raw)
  );
}
function editionKey(f: CatalogIdentity) {
  return brandKey(f.brand) + "|" + editionName(f);
}
export function fragranceKey(f: CatalogIdentity) {
  return editionKey(f) + "|" + editionConcentration(f);
}
export function matchingCatalogEdition(a: CatalogIdentity, b: CatalogIdentity) {
  const ac = editionConcentration(a),
    bc = editionConcentration(b);
  return editionKey(a) === editionKey(b) && (!ac || !bc || ac === bc);
}
export function mergeFragrances(local: Fragrance[], incoming: Fragrance[]) {
  const groups = new Map<string, Fragrance[]>();
  for (const item of [...local, ...incoming]) {
    const key = editionKey(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  const result: Fragrance[] = [];
  for (const group of groups.values()) {
    const known = new Map<string, Fragrance>();
    for (const item of group) {
      const concentration = editionConcentration(item);
      if (concentration && !known.has(concentration))
        known.set(concentration, item);
    }
    // An unspecified record is not another edition. Keep explicitly identified
    // concentrations, or one unspecified listing when no edition is known.
    result.push(...(known.size ? known.values() : [group[0]]));
  }
  return result;
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
