import { env } from "@/db/runtime";
import { getSessionUser } from "@/lib/server/session";
import { getDb } from "@/db";
import { users, audit } from "@/db/schema";
import { databaseConfigured } from "./configuration";
import { memoryLimit } from "./memory-limits";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function setting(key: string): string | undefined {
  return process.env[key];
}
export async function identity() {
  const u = await getSessionUser();
  return u
    ? {
        id: u.userId,
        name: u.fullName || "Fragrance explorer",
        admin: (setting("ADMIN_USER_IDS") || "")
          .split(",")
          .map((x) => x.trim())
          .includes(u.userId),
      }
    : null;
}
export async function requireUser() {
  if (!databaseConfigured())
    throw new HttpError(
      503,
      "Account features are temporarily unavailable. Please try again later.",
    );
  const user = await identity();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  await getDb()
    .insert(users)
    .values({
      id: user.id,
      displayName: user.name,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing();
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!user.admin)
    throw new HttpError(403, "Administrator access is required.");
  return user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next's Node adapter may use its listen hostname in request.url. The HTTP
  // Host identifies the visitor-facing origin; Render terminates TLS upstream.
  const expected = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `${url.protocol}//${request.headers.get("host") || url.host}`,
  ).origin;
  if (
    (origin && origin !== expected) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Cross-site changes are not allowed.");
}
export async function limited(key: string, limit: number, seconds: number) {
  if (!databaseConfigured()) {
    if (!memoryLimit(key, limit, seconds))
      throw new HttpError(
        429,
        "Too many requests. Please wait a moment and try again.",
      );
    return;
  }
  const window = Math.floor(Date.now() / (seconds * 1000)),
    bucket = `${key}:${window}`;
  const result = await env.DB.prepare(
    "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(bucket, Date.now() + seconds * 1000)
    .first<{ count: number }>();
  if ((result?.count ?? 0) > limit)
    throw new HttpError(
      429,
      "Too many requests. Please wait a moment and try again.",
    );
  await env.DB.prepare("DELETE FROM rate_limits WHERE expires < ?")
    .bind(Date.now())
    .run();
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 120000)
    throw new HttpError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 120000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export async function logAction(
  userId: string,
  action: string,
  entityId: string,
) {
  await getDb().insert(audit).values({
    id: crypto.randomUUID(),
    userId,
    action,
    entityId,
    createdAt: new Date().toISOString(),
  });
}
