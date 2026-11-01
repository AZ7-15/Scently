import { brandConfig } from "@/lib/domain";
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api/"],
    },
    sitemap: brandConfig.origin + "/sitemap.xml",
  };
}
