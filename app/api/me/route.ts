import { identity } from "@/lib/server/security";
export async function GET() {
  return Response.json(
    { user: await identity() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
