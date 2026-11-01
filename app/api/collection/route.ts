import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { collections } from "@/db/schema";
import { collectionStatuses } from "@/lib/domain";
import { getCatalog } from "@/lib/server/catalog";
import {
  requireUser,
  sameOrigin,
  readBody,
  HttpError,
} from "@/lib/server/security";
import { failure } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const b = z
      .object({
        fragranceId: z.string(),
        status: z.enum(collectionStatuses).nullable(),
      })
      .parse(await readBody(request));
    if (!(await getCatalog()).some((f) => f.id === b.fragranceId))
      throw new HttpError(404, "Fragrance not found.");
    const db = getDb();
    if (b.status)
      await db
        .insert(collections)
        .values({
          userId: user.id,
          fragranceId: b.fragranceId,
          status: b.status,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [collections.userId, collections.fragranceId],
          set: { status: b.status },
        });
    else
      await db
        .delete(collections)
        .where(
          and(
            eq(collections.userId, user.id),
            eq(collections.fragranceId, b.fragranceId),
          ),
        );
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
