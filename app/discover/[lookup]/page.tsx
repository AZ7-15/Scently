import { getLiveFragrance, FragranceSourceError } from "@/lib/server/scento";
import { curatedCatalog } from "@/data/catalog";
import { sameFragrance } from "@/lib/catalog";
import { Bottle } from "@/components/scently/product";
import { ProductPhoto } from "@/components/scently/product-photo";
import Link from "@/components/scently/site-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Fragrance profile" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lookup: string }>;
  searchParams: Promise<{
    name?: string;
    brand?: string;
    concentration?: string;
  }>;
}) {
  const { lookup } = await params;
  const result = await getLiveFragrance(lookup).then(
    (value) => ({ value, error: null }),
    (error: unknown) => ({ value: null, error }),
  );
  if (!result.value) return <ProfileFailure error={result.error} />;
  const fragrance = result.value;
  const expected = await searchParams;
  if (
    expected.name &&
    expected.brand &&
    !sameFragrance(
      {
        name: expected.name,
        brand: expected.brand,
        concentration: expected.concentration,
      },
      fragrance,
    )
  )
    return (
      <ProfileFailure
        error={
          new FragranceSourceError(
            "The source returned a different fragrance or concentration. Its details have been withheld.",
            404,
          )
        }
      />
    );
  const local = curatedCatalog.find(
    (item) => !!fragrance.concentration && sameFragrance(item, fragrance),
  );
  return (
    <main id="main" className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/fragrances">Fragrances</Link>
        <span>/</span>
        <span>{fragrance.name}</span>
      </nav>
      <section className="live-profile-hero">
        <div>
          <div className="eyebrow">{fragrance.brand}</div>
          <h1>{fragrance.name}</h1>
          <p className="detail-meta">
            {[
              fragrance.concentration,
              fragrance.year,
              fragrance.perfumer && "By " + fragrance.perfumer,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p>{fragrance.description}</p>
          <p className="info-line">
            {fragrance.family}
            {fragrance.subfamily ? " · " + fragrance.subfamily : ""}
          </p>
          <a
            className="source-link"
            href={fragrance.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source: {fragrance.source}
          </a>
          <p className="quiet-note">
            Provider-supplied information · retrieved{" "}
            {fragrance.checkedAt.slice(0, 10)}. Missing fields remain
            unavailable.
          </p>
        </div>
        <div className="detail-image">
          {local ? (
            <Bottle fragrance={local} large />
          ) : (
            <ProductPhoto
              name={fragrance.name}
              brand={fragrance.brand}
              concentration={fragrance.concentration || ""}
              sourceUrl={fragrance.sourceUrl}
              large
            />
          )}
        </div>
      </section>
      <section className="panel detail-section">
        <h2>Fragrance pyramid</h2>
        <div className="live-pyramid">
          {(["top", "heart", "base"] as const).map((stage) => (
            <section key={stage}>
              <h3>{stage} notes</h3>
              {fragrance.pyramid[stage].length ? (
                <ul>
                  {fragrance.pyramid[stage].map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : (
                <p>Not provided by the source.</p>
              )}
            </section>
          ))}
        </div>
        {!!fragrance.notes.length && (
          <>
            <h3>Other listed notes</h3>
            <p>{fragrance.notes.join(" · ")}</p>
          </>
        )}
      </section>
      <section className="detail-section">
        <h2>Season guidance</h2>
        <p>
          {fragrance.seasons.length
            ? fragrance.seasons.join(" · ")
            : "Not provided by the source."}
        </p>
        <p className="quiet-note">
          Source guidance, rather than Scently community votes. Verified
          wear-time measurements and current retailer totals are unavailable.
        </p>
      </section>
      {local && (
        <p>
          <a className="button secondary" href={"/fragrances/" + local.slug}>
            Community reviews & collection
          </a>
        </p>
      )}
      <p className="detail-section">
        <a
          className="text-link"
          href={"/fragrances?" + new URLSearchParams({ q: fragrance.brand })}
        >
          Explore more from {fragrance.brand}
        </a>
      </p>
    </main>
  );
}
function ProfileFailure({ error: e }: { error: unknown }) {
  const unavailable = e instanceof FragranceSourceError && e.status === 404;
  return (
    <main id="main" className="container page">
      <section className="empty-state">
        <h1>
          {unavailable
            ? "This profile is not available."
            : "A pause in discovery."}
        </h1>
        <p>
          {e instanceof FragranceSourceError
            ? e.message
            : "We could not load this fragrance. Please try again."}
        </p>
        <Link className="button primary" href="/fragrances">
          Search the fragrance database
        </Link>
      </section>
    </main>
  );
}
