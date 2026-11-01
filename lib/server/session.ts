import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { env } from "@/db/runtime";

const scrypt = promisify(scryptCallback);
export const sessionCookie = "scently_session";
export const sessionLifetime = 30 * 24 * 60 * 60;
export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !hex || hex.length !== 128)
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await env.DB.prepare("DELETE FROM sessions WHERE expires<?")
    .bind(Date.now())
    .run();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash,user_id,expires) VALUES (?,?,?)",
  )
    .bind(tokenHash(token), userId, Date.now() + sessionLifetime * 1000)
    .run();
  return token;
}
export async function getSessionUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || token.length > 100) return null;
  return env.DB.prepare(
    "SELECT u.id AS userId,u.display_name AS fullName FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?",
  )
    .bind(tokenHash(token), Date.now())
    .first<{ userId: string; fullName: string }>();
}
export function safeReturnPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/account";
  const url = new URL(value, "https://scently.local");
  if (
    url.origin !== "https://scently.local" ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/login"
  )
    return "/account";
  return url.pathname + url.search + url.hash;
}
