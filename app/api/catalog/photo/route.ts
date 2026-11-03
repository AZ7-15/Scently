import { z } from "zod";
import { resolveProductPhotos } from "@/lib/server/product-photos";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const input = z
      .object({
        name: z.string().trim().min(1).max(250),
        brand: z.string().trim().min(1).max(250),
        concentration: z.string().max(100),
        source: z.string().max(1000),
      })
      .parse({
        name: params.get("name"),
        brand: params.get("brand"),
        concentration: params.get("concentration") || "",
        source: params.get("source") || "",
      });
    const failed = z
      .array(z.string().url().max(1500))
      .max(4)
      .parse(params.getAll("failed"));
    const result = await resolveProductPhotos(
      input.name,
      input.brand,
      input.source,
      input.concentration,
      params.get("retry") === "1",
      failed,
    );
    return Response.json(result, {
      status: result.retryAfter ? 202 : 200,
      headers: {
        "Cache-Control": result.retryAfter
          ? "no-store"
          : result.images.length
            ? "public, max-age=86400"
            : "public, max-age=60",
      },
    });
  } catch {
    return Response.json({ images: [] }, { status: 400 });
  }
}
