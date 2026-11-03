import { noteProfile } from "@/lib/note-profiles";
import { sourceMarkup } from "@/lib/server/fragrance-editorial";
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() || "";
  if (!name || name.length > 200)
    return Response.json({ imageUrl: null }, { status: 400 });
  const profile = noteProfile(name);
  let imageUrl: string | null = null;
  let sourceSlug = profile.exactSlug;
  for (const slug of new Set([profile.exactSlug, profile.slug])) {
    const html = await sourceMarkup("/note/" + slug);
    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0];
      if (!/fetchPriority="high"/i.test(tag)) continue;
      const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
      if (!src) continue;
      try {
        const outer = new URL(
          src.replaceAll("&amp;", "&"),
          "https://www.scento.com",
        );
        const image = new URL(outer.searchParams.get("url") || outer.href);
        const segment = image.pathname.split("/").at(-2)?.replace(/_/g, "-");
        if (
          image.protocol === "https:" &&
          image.hostname === "imagedelivery.net" &&
          segment === slug
        )
          imageUrl = image.href;
      } catch {}
      if (imageUrl) {
        sourceSlug = slug;
        break;
      }
    }
    if (imageUrl) break;
  }
  return Response.json(
    { imageUrl, sourceUrl: "https://www.scento.com/note/" + sourceSlug },
    {
      headers: {
        "Cache-Control": imageUrl
          ? "public, max-age=86400"
          : "public, max-age=300",
      },
    },
  );
}
