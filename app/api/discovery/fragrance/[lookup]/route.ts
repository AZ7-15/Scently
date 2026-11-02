import { z } from "zod";
import { FragranceSourceError, getLiveFragrance } from "@/lib/server/scento";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lookup: string }> },
) {
  try {
    return Response.json(await getLiveFragrance((await params).lookup), {
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
        ? "Invalid fragrance name."
        : error instanceof FragranceSourceError
          ? error.message
          : "Fragrance lookup is temporarily unavailable.";
    return Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
