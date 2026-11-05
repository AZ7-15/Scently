import { z } from "zod";

export const dynamic = "force-dynamic";
const imageHosts = new Set(["imagedelivery.net", "cdn.shopify.com"]);
const empty = (status: number) =>
  new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(request: Request) {
  const parsed = z
    .string()
    .url()
    .max(2500)
    .safeParse(new URL(request.url).searchParams.get("url"));
  if (!parsed.success) return empty(400);

  let image: URL;
  try {
    image = new URL(parsed.data);
  } catch {
    return empty(400);
  }
  if (
    image.protocol !== "https:" ||
    !imageHosts.has(image.hostname) ||
    image.username ||
    image.password
  )
    return empty(403);

  try {
    const upstream = await fetch(image.href, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*" },
      cache: "force-cache",
      next: { revalidate: 604800 },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    const contentType = upstream.headers.get("content-type") || "";
    const declaredLength = Number(upstream.headers.get("content-length") || 0);
    if (
      !upstream.ok ||
      !contentType.startsWith("image/") ||
      declaredLength > 10_000_000
    )
      return empty(502);
    const body = new Uint8Array(await upstream.arrayBuffer());
    if (!body.length || body.length > 10_000_000) return empty(502);
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return empty(502);
  }
}
