import type { Filters } from "./discovery";
export function catalogParameters(filters: Filters, query = filters.q || "") {
  const p = new URLSearchParams({ q: query });
  for (const note of filters.notes || []) p.append("note", note);
  for (const season of filters.seasons || []) p.append("season", season);
  for (const key of [
    "brand",
    "family",
    "concentration",
    "projection",
    "style",
    "occasion",
    "sort",
    "region",
    "budget",
    "minHours",
    "minRating",
  ] as const)
    if (filters[key]) p.set(key, String(filters[key]));
  return p;
}
export function catalogFilters(p: URLSearchParams): Filters {
  const filters: Filters = {
    q: p.get("q") || "",
    notes: p.getAll("note").slice(0, 10),
    seasons: p.getAll("season").slice(0, 4),
  };
  for (const key of [
    "brand",
    "family",
    "concentration",
    "projection",
    "style",
    "occasion",
    "sort",
    "region",
  ] as const)
    if (p.get(key)) filters[key] = p.get(key)!.slice(0, 150);
  for (const key of ["budget", "minHours", "minRating"] as const) {
    const n = Number(p.get(key));
    if (Number.isFinite(n) && n > 0) filters[key] = n;
  }
  return filters;
}
export function catalogSourceQuery(filters: Filters) {
  return (
    filters.brand ||
    filters.q ||
    filters.notes?.[0] ||
    filters.family ||
    filters.seasons?.[0] ||
    ""
  ).trim();
}
