import { brandSuggestions } from "@/lib/live-catalog";
import { sourceFacets } from "./source-browse";
export async function catalogFacets(): Promise<{
  brands: string[];
  notes: string[];
}> {
  try {
    const facets = await sourceFacets();
    return {
      brands: facets.brands.map((b) => b.name),
      notes: facets.notes.map((n) => n.name),
    };
  } catch {
    return {
      brands: [...new Set(Object.values(brandSuggestions).flat())].sort(),
      notes: [],
    };
  }
}
