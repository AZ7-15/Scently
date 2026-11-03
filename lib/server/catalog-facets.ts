import { getOpenCatalog } from "./open-catalog";
import { brandKey } from "@/lib/catalog";
import { brandSuggestions } from "@/lib/live-catalog";
import { sourceFacets } from "./source-browse";
export async function catalogFacets(): Promise<{
  brands: string[];
  notes: string[];
}> {
  try {
    const [facets, open] = await Promise.all([
      sourceFacets(),
      getOpenCatalog(),
    ]);
    return {
      brands: [
        ...new Map(
          [
            ...facets.brands.map((b) => b.name),
            ...open.map((f) => f.brand),
          ].map((name) => [brandKey(name), name]),
        ).values(),
      ].sort(),
      notes: [
        ...new Set([
          ...facets.notes.map((n) => n.name),
          ...open.flatMap((f) => f.notes.map((n) => n.name)),
        ]),
      ].sort(),
    };
  } catch {
    const open = await getOpenCatalog();
    return {
      brands: [
        ...new Set([
          ...Object.values(brandSuggestions).flat(),
          ...open.map((f) => f.brand),
        ]),
      ].sort(),
      notes: [
        ...new Set(open.flatMap((f) => f.notes.map((n) => n.name))),
      ].sort(),
    };
  }
}
