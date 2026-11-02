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
        source: z.string().max(1000),
      })
      .parse({
        name: params.get("name"),
        brand: params.get("brand"),
        source: params.get("source") || "",
      });
    const result = await resolveProductPhotos(
      input.name,
      input.brand,
      input.source,
    );
    return Response.json(result, {
      headers: {
        "Cache-Control": result.images.length
          ? "public, max-age=86400"
          : "public, max-age=60",
      },
    });
  } catch {
    return Response.json({ images: [] }, { status: 400 });
  }
}
