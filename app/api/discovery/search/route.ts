import { z } from "zod";
import {
  FragranceSourceError,
  searchLiveFragrances,
} from "@/lib/server/scento";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const result = await searchLiveFragrances(
      params.get("q") || "",
      params.get("continuation") || undefined,
    );
    return Response.json(result, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (error) {
    const status =
      error instanceof z.ZodError
        ? 400
        : error instanceof FragranceSourceError
          ? error.status
          : 502;
    const message =
      error instanceof z.ZodError
        ? "Search using 2–150 characters."
        : error instanceof FragranceSourceError
          ? error.message
          : "Fragrance search is temporarily unavailable.";
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
