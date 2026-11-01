import { z } from "zod";
import { criteriaSchema } from "@/lib/domain";
import { getCatalog } from "@/lib/server/catalog";
import { identity, sameOrigin, readBody, limited } from "@/lib/server/security";
import { failure } from "@/lib/server/http";
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
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
