import { brandConfig } from "@/lib/domain";
import { getCatalog } from "@/lib/server/catalog";
export default async function sitemap() {
  return [
    "",
    "/fragrances",
    "/finder",
    "/reviews",
    ...(await getCatalog()).map((f) => "/fragrances/" + f.slug),
  ].map((path) => ({ url: brandConfig.origin + path }));
}
