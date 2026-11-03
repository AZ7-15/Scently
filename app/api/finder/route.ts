import { z } from "zod";
import { criteriaSchema } from "@/lib/domain";
import { getCatalog } from "@/lib/server/catalog";
import { identity, sameOrigin, readBody, limited } from "@/lib/server/security";
import { failure } from "@/lib/server/http";
import { FragranceSourceError } from "@/lib/server/scento";
import { findFragrances } from "@/lib/server/finder";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await identity();
    const id = user?.id || "anonymous";
    await limited("finder:" + id, 20, 3600);
    await limited("finder:global", 300, 3600);
    const b = z
      .object({
        message: z.string().trim().min(2).max(1500),
        previous: criteriaSchema.optional(),
        continuation: z.string().max(2000).optional(),
        seen: z.array(z.string().max(250)).max(2000).default([]),
        region: z.enum(["CA", "US"]).default("CA"),
      })
      .parse(await readBody(request));
    return Response.json(
      await findFragrances(
        b.message,
        await getCatalog(),
        b.previous,
        b.region,
        id,
        b.continuation,
        b.seen,
      ),
    );
  } catch (e) {
    if (e instanceof FragranceSourceError)
      return Response.json({ error: e.message }, { status: e.status });
    return failure(e);
  }
}
