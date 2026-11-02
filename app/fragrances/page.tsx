import { getCatalog } from "@/lib/server/catalog";
import { Explorer } from "@/components/scently/explorer";
import { LiveCatalog } from "@/components/scently/live-catalog";
import { searchLiveFragrances } from "@/lib/server/scento";
import type { LiveSearch } from "@/lib/live-catalog";
import Link from "@/components/scently/site-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore fragrances" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const community =
    params.view === "community" ||
    (params.view !== "live" &&
      ["note", "season", "family", "budget", "hours"].some(
        (key) => params[key],
      ));
  const query = typeof params.q === "string" ? params.q.slice(0, 150) : "";
  let initialResult: LiveSearch | null = null,
    error = "";
  if (!community && query.trim().length >= 2) {
    try {
      initialResult = await searchLiveFragrances(query);
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
        <h1>
          A world of scent.
          <br />
          <em>A place to start.</em>
        </h1>
        <p>
          Search fragrances and brands, from everyday favorites to designer,
          niche, and Arabian houses. Availability follows the source catalog.
        </p>
      </div>
      <nav className="catalog-tabs" aria-label="Catalog source">
        <Link href="/fragrances" aria-current={!community ? "page" : undefined}>
          Live fragrance database
        </Link>
        <Link
          href="/fragrances?view=community"
          aria-current={community ? "page" : undefined}
        >
          Community catalog & filters
        </Link>
      </nav>
      {community ? (
        <Explorer catalog={await getCatalog()} />
      ) : (
        <LiveCatalog
          initialQuery={query}
          initialResult={initialResult}
          initialError={error}
        />
      )}
    </main>
  );
}
