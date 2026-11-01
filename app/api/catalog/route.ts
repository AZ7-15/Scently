import { getCatalog } from "@/lib/server/catalog";
import { searchCatalog } from "@/lib/discovery";
import { failure } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const p = new URL(request.url).searchParams;
    const page = Math.max(1, Math.min(1000, Number(p.get("page")) || 1));
    const results = searchCatalog(await getCatalog(), {
      q: p.get("q") || "",
      notes: p.getAll("note"),
      seasons: p.getAll("season"),
      region: p.get("region") === "US" ? "US" : "CA",
    });
    return Response.json(
      {
        results: results.slice((page - 1) * 12, page * 12),
        page,
        total: results.length,
      },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    return failure(e);
  }
}
