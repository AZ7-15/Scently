import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Shell } from "@/components/scently/shell";
import { identity } from "@/lib/server/security";
import { getDb } from "@/db";
import { collections } from "@/db/schema";
import { brandConfig, type CollectionStatus } from "@/lib/domain";
import "./globals.css";
import { Ready } from "@/components/scently/ready";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: brandConfig.name + " — Fragrance catalog and discovery",
    template: "%s | " + brandConfig.name,
  },
  description:
    "Explore fragrance notes, compare fragrances, read community reviews, and use the fragrance finder.",
  metadataBase: new URL(brandConfig.origin),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Scently — Find your perfect fragrance",
    description: brandConfig.tagline,
    images: ["/images/fragrance-still-life.png"],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await identity();
  const rows = user
    ? await getDb()
        .select()
        .from(collections)
        .where(eq(collections.userId, user.id))
    : [];
  return (
    <html lang="en">
      <body>
        <noscript>
          Please enable JavaScript to use Scently’s interactive discovery tools.
        </noscript>
        <Ready>
          <Shell
            user={user}
            initialShelf={Object.fromEntries(
              rows.map((r) => [r.fragranceId, r.status as CollectionStatus]),
            )}
          >
            {children}
          </Shell>
        </Ready>
      </body>
    </html>
  );
}
