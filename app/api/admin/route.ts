import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reviews, reports, offers, retailers } from "@/db/schema";
import { fragranceSchema, offerSchema, normalize } from "@/lib/domain";
import { prepareImport } from "@/lib/importer";
import { getCatalog, saveFragrance } from "@/lib/server/catalog";
import { saveOffer } from "@/lib/server/offers";
import {
  requireAdmin,
  sameOrigin,
  readBody,
  logAction,
  HttpError,
} from "@/lib/server/security";
import { failure } from "@/lib/server/http";
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("fragrance"),
    record: fragranceSchema,
    overwrite: z.boolean().default(false),
  }),
  z.object({ action: z.literal("offer"), record: offerSchema }),
  z.object({ action: z.literal("delete-offer"), id: z.string() }),
  z.object({
    action: z.literal("moderate"),
    id: z.string(),
    status: z.enum(["published", "hidden", "pending"]),
  }),
  z.object({ action: z.literal("resolve-report"), id: z.string() }),
  z.object({
    action: z.literal("retailer"),
    id: z.string(),
    status: z.enum(["active", "inactive"]),
  }),
  z.object({
    action: z.literal("import"),
    content: z.string().max(110000),
    format: z.enum(["csv", "json"]),
    commit: z.boolean().default(false),
  }),
]);
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireAdmin();
    const b = actionSchema.parse(await readBody(request)),
      db = getDb();
    let entity = "";
    if (b.action === "fragrance") {
      const catalog = await getCatalog();
      if (
        !b.overwrite &&
        catalog.some(
          (f) =>
            f.id === b.record.id ||
            f.slug === b.record.slug ||
            normalize(f.brand + "|" + f.name + "|" + f.concentration) ===
              normalize(
                b.record.brand +
                  "|" +
                  b.record.name +
                  "|" +
                  b.record.concentration,
              ),
        )
      )
        throw new HttpError(
          409,
          "This fragrance already exists. Select it and explicitly enable overwrite.",
        );
      await saveFragrance(b.record, b.overwrite);
      entity = b.record.id;
    }
    if (b.action === "offer") {
      if (
        !(await getCatalog()).some(
          (f) =>
            f.id === b.record.fragranceId &&
            f.concentration === b.record.concentration,
        )
      )
        throw new HttpError(
          400,
          "Offer must reference an existing fragrance with the same concentration.",
        );
      await saveOffer(b.record);
      entity = b.record.id;
    }
    if (b.action === "delete-offer") {
      await db.delete(offers).where(eq(offers.id, b.id));
      entity = b.id;
    }
    if (b.action === "moderate") {
      await db
        .update(reviews)
        .set({ status: b.status, updatedAt: new Date().toISOString() })
        .where(eq(reviews.id, b.id));
      entity = b.id;
    }
    if (b.action === "resolve-report") {
      await db
        .update(reports)
        .set({ status: "resolved" })
        .where(eq(reports.id, b.id));
      entity = b.id;
    }
    if (b.action === "retailer") {
      await db
        .update(retailers)
        .set({ status: b.status })
        .where(eq(retailers.id, b.id));
      entity = b.id;
    }
    if (b.action === "import") {
      const result = prepareImport(b.content, b.format),
        catalog = await getCatalog();
      for (const [i, f] of result.records.entries())
        if (
          catalog.some(
            (v) =>
              v.id === f.id ||
              v.slug === f.slug ||
              normalize(v.brand + "|" + v.name + "|" + v.concentration) ===
                normalize(f.brand + "|" + f.name + "|" + f.concentration),
          )
        )
          result.errors.push({
            row: i + 1,
            message: `${f.name} already exists; imports never overwrite records.`,
          });
      if (b.commit && result.errors.length)
        throw new HttpError(
          400,
          "Resolve all validation errors before importing.",
        );
      if (b.commit) {
        for (const f of result.records) await saveFragrance(f, false);
        await logAction(user.id, "import", String(result.records.length));
      }
      return Response.json({
        count: result.records.length,
        errors: result.errors,
        committed: b.commit,
      });
    }
    await logAction(user.id, b.action, entity);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof SyntaxError)
      return failure(new HttpError(400, "Invalid JSON data."));
    return failure(e);
  }
}
