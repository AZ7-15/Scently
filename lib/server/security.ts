import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { users, audit } from "@/db/schema";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function setting(key: string): string | undefined {
  return (env as unknown as Record<string, string>)[key] || process.env[key];
}
export async function identity() {
  const u = await getChatGPTUser();
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
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Cross-site changes are not allowed.");
}
export async function limited(key: string, limit: number, seconds: number) {
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
  await getDb()
    .insert(audit)
    .values({
      id: crypto.randomUUID(),
      userId,
      action,
      entityId,
      createdAt: new Date().toISOString(),
    });
}
