import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/db/runtime";
import {
  createSession,
  hashPassword,
  safeReturnPath,
  sessionCookie,
  sessionLifetime,
  tokenHash,
  verifyPassword,
} from "@/lib/server/session";
import {
  HttpError,
  limited,
  readBody,
  sameOrigin,
} from "@/lib/server/security";
import { failure } from "@/lib/server/http";
import { databaseConfigured } from "@/lib/server/configuration";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (!databaseConfigured())
      throw new HttpError(
        503,
        "Account features are temporarily unavailable. Please try again later.",
      );
    const json = request.headers
      .get("content-type")
      ?.includes("application/json");
    const raw = json
      ? await readBody(request)
      : Object.fromEntries(await request.formData());
    const body = z
      .object({
        action: z.enum([
          "register",
          "login",
          "logout",
          "change-password",
          "recover-password",
        ]),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase())
          .optional(),
        password: z.string().min(1).max(128).optional(),
        currentPassword: z.string().min(1).max(128).optional(),
        newPassword: z.string().min(12).max(128).optional(),
        recoveryKey: z.string().min(1).max(256).optional(),
        name: z.string().trim().min(2).max(60).optional(),
        returnTo: z.string().max(2000).optional(),
      })
      .parse(raw);
    if (body.action === "logout") {
      const token = (await cookies()).get(sessionCookie)?.value;
      if (token)
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
          .bind(tokenHash(token))
          .run();
      const response = json
        ? NextResponse.json({ ok: true })
        : new NextResponse(null, {
            status: 303,
            headers: { Location: "/", "Cache-Control": "no-store" },
          });
      response.cookies.set(sessionCookie, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return response;
    }
    if (body.action === "change-password") {
      const token = (await cookies()).get(sessionCookie)?.value;
      if (!token) throw new HttpError(401, "Sign in to change your password.");
      if (!body.currentPassword || !body.newPassword)
        throw new HttpError(400, "Enter your current and new passwords.");
      const session = await env.DB.prepare(
        "SELECT user_id FROM sessions WHERE token_hash=? AND expires>?",
      )
        .bind(tokenHash(token), Date.now())
        .first<{ user_id: string }>();
      if (!session)
        throw new HttpError(401, "Your session expired. Sign in again.");
      await limited("auth:password-change:" + session.user_id, 5, 900);
      const credential = await env.DB.prepare(
        "SELECT password_hash FROM credentials WHERE user_id=?",
      )
        .bind(session.user_id)
        .first<{ password_hash: string }>();
      if (
        !credential ||
        !(await verifyPassword(
          body.currentPassword,
          credential.password_hash,
        ))
      )
        throw new HttpError(401, "Your current password is incorrect.");
      if (body.newPassword.length < 12)
        throw new HttpError(
          400,
          "Your new password must be at least 12 characters.",
        );
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE credentials SET password_hash=? WHERE user_id=?",
        )
          .bind(await hashPassword(body.newPassword), session.user_id),
        env.DB.prepare(
          "DELETE FROM sessions WHERE user_id=? AND token_hash<>?",
        )
          .bind(session.user_id, tokenHash(token)),
      ]);
      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (body.action === "recover-password") {
      const configuredKey = process.env.ACCOUNT_RECOVERY_KEY;
      if (!configuredKey)
        throw new HttpError(
          503,
          "Password recovery is not configured. Contact the site owner.",
        );
      if (!body.email || !body.newPassword || !body.recoveryKey)
        throw new HttpError(400, "Complete all recovery fields.");
      const ip =
        process.env.RENDER === "true"
          ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown"
          : "local";
      await limited("auth:recover:ip:" + tokenHash(ip), 8, 900);
      const submitted = createHash("sha256")
        .update(body.recoveryKey)
        .digest();
      const configured = createHash("sha256").update(configuredKey).digest();
      if (!timingSafeEqual(submitted, configured))
        throw new HttpError(401, "The recovery key is incorrect.");
      await limited("auth:recover:email:" + tokenHash(body.email), 5, 900);
      const credential = await env.DB.prepare(
        "SELECT user_id FROM credentials WHERE email=?",
      )
        .bind(body.email)
        .first<{ user_id: string }>();
      if (credential) {
        await env.DB.batch([
          env.DB.prepare(
            "UPDATE credentials SET password_hash=? WHERE user_id=?",
          ).bind(await hashPassword(body.newPassword), credential.user_id),
          env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(
            credential.user_id,
          ),
        ]);
      }
      return NextResponse.json(
        { ok: true, message: "If the account exists, its password was reset. You can now sign in." },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!body.email || !body.password)
      throw new HttpError(400, "Enter your email address and password.");
    const ip =
      process.env.RENDER === "true"
        ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown"
        : "local";
    await limited("auth:ip:" + tokenHash(ip), 30, 900);
    await limited("auth:email:" + tokenHash(body.email), 10, 900);
    const credential = await env.DB.prepare(
      "SELECT user_id,password_hash FROM credentials WHERE email=?",
    )
      .bind(body.email)
      .first<{ user_id: string; password_hash: string }>();
    let userId: string;
    if (body.action === "register") {
      if (!body.name || body.password.length < 12)
        throw new HttpError(
          400,
          "Enter a display name and a password with at least 12 characters.",
        );
      if (credential)
        throw new HttpError(
          409,
          "Unable to create this account. Try signing in instead.",
        );
      userId = crypto.randomUUID();
      const hash = await hashPassword(body.password);
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO users (id,display_name,created_at) VALUES (?,?,?)",
        ).bind(userId, body.name, new Date().toISOString()),
        env.DB.prepare(
          "INSERT INTO credentials (user_id,email,password_hash) VALUES (?,?,?)",
        ).bind(userId, body.email, hash),
      ]);
    } else {
      // Perform the same expensive derivation for an unknown account.
      const valid = await verifyPassword(
        body.password,
        credential?.password_hash ||
          "scrypt:00000000000000000000000000000000:" + "00".repeat(64),
      );
      if (!credential || !valid)
        throw new HttpError(401, "Email or password is incorrect.");
      userId = credential.user_id;
    }
    const previous = (await cookies()).get(sessionCookie)?.value;
    if (previous)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(tokenHash(previous))
        .run();
    const token = await createSession(userId);
    const redirectTo = safeReturnPath(body.returnTo);
    const response = NextResponse.json({ ok: true, redirectTo });
    response.cookies.set(sessionCookie, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionLifetime,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    return failure(e);
  }
}
