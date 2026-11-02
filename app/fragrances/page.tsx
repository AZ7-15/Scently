import { Explorer } from "@/components/scently/explorer";
import { searchUnifiedCatalog } from "@/lib/server/unified-catalog";
import { getCatalog } from "@/lib/server/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore fragrances" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 150) : "";
  const local = await getCatalog();
  let data = {
    results: local,
    continuation: null as string | null,
    providerTotal: 0,
    notice: "",
  };
  if (query.trim().length >= 2) {
    try {
      data = await searchUnifiedCatalog(query);
    } catch {
      data.notice =
        "The fragrance source is temporarily unavailable. You can still browse the available catalog.";
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
      <Explorer
        catalog={data.results}
        initialCatalog={local}
        initialContinuation={data.continuation}
        initialProviderTotal={data.providerTotal}
        initialNotice={data.notice}
      />
    </main>
  );
}
