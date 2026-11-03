import { catalogFilters } from "@/lib/catalog-filters";
import { searchUnifiedCatalog } from "@/lib/server/unified-catalog";
import { failure } from "@/lib/server/http";
import { FragranceSourceError } from "@/lib/server/scento";
export async function GET(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    const q = p.get("q") || "";
    if (q.length > 150 || (p.get("continuation")?.length || 0) > 2000)
      return Response.json({ error: "Search is too long." }, { status: 400 });
    const result = await searchUnifiedCatalog(
      q,
      p.get("continuation") || undefined,
      catalogFilters(p),
    );
    return Response.json(
      {
        ...result,
        total: result.results.length,
      },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    if (e instanceof FragranceSourceError)
      return Response.json({ error: e.message }, { status: e.status });
    return failure(e);
  }
}
