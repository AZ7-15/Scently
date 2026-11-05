import { brandConfig, fragrancePath } from "@/lib/domain";
import { getCatalog } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  return [
    "",
    "/fragrances",
    "/finder",
    "/reviews",
    ...(await getCatalog()).map((f) => fragrancePath(f)),
  ].map((path) => ({ url: brandConfig.origin + path }));
}
