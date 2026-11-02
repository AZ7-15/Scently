import { env } from "@/db/runtime";
import { databaseConfigured } from "@/lib/server/configuration";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!databaseConfigured())
    return Response.json(
      { status: "ok", mode: "browse-only", database: "not_configured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    await env.DB.prepare("SELECT 1").first();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
