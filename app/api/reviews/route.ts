import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { reviews, helpfulVotes, reports } from "@/db/schema";
import { reviewSchema } from "@/lib/domain";
import { getCatalog, getReviews } from "@/lib/server/catalog";
import {
  requireUser,
  sameOrigin,
  readBody,
  limited,
  HttpError,
} from "@/lib/server/security";
import { failure } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    return Response.json(
      await getReviews(
        undefined,
        new URL(request.url).searchParams.get("fragranceId") || undefined,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    await limited("review:" + user.id, 15, 3600);
    const body = await readBody(request);
    const b = reviewSchema.parse(body);
    if (!(await getCatalog()).some((f) => f.id === b.fragranceId))
      throw new HttpError(404, "Fragrance not found.");
    const db = getDb(),
      existing = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, user.id),
            eq(reviews.fragranceId, b.fragranceId),
          ),
        )
        .get();
    const now = new Date().toISOString();
    if (existing)
      await db
        .update(reviews)
        .set({
          ...b,
          updatedAt: now,
          status: existing.status === "published" ? "published" : "pending",
        })
        .where(eq(reviews.id, existing.id));
    else
      await db.insert(reviews).values({
        ...b,
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: now,
        updatedAt: now,
        status: "published",
      });
    return Response.json(
      { reviews: await getReviews(user.id, b.fragranceId) },
      { status: existing ? 200 : 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    await limited("review-action:" + user.id, 60, 3600);
    const b = z
      .object({
        id: z.string().min(1),
        action: z.enum(["helpful", "report"]),
        reason: z.string().trim().min(5).max(500).optional(),
      })
      .parse(await readBody(request));
    const db = getDb(),
      r = await db.select().from(reviews).where(eq(reviews.id, b.id)).get();
    if (!r || r.status !== "published")
      throw new HttpError(404, "Review not found.");
    if (r.userId === user.id)
      throw new HttpError(400, "You cannot vote on or report your own review.");
    if (b.action === "helpful")
      await db
        .insert(helpfulVotes)
        .values({ userId: user.id, reviewId: r.id })
        .onConflictDoNothing();
    else {
      if (!b.reason) throw new HttpError(400, "Please include a reason.");
      await db
        .insert(reports)
        .values({
          id: crypto.randomUUID(),
          reviewId: r.id,
          userId: user.id,
          reason: b.reason,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing();
    }
    return Response.json({ reviews: await getReviews(user.id, r.fragranceId) });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser(),
      { id } = z.object({ id: z.string() }).parse(await readBody(request));
    const db = getDb(),
      r = await db.select().from(reviews).where(eq(reviews.id, id)).get();
    if (!r) throw new HttpError(404, "Review not found.");
    if (r.userId !== user.id)
      throw new HttpError(403, "You can only delete your own review.");
    await db.delete(reviews).where(eq(reviews.id, id));
    return Response.json({ reviews: await getReviews(user.id, r.fragranceId) });
  } catch (e) {
    return failure(e);
  }
}
