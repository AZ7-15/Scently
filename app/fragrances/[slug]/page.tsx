import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  Wind,
  Users,
  Flower2,
  Sun,
  Leaf,
  Snowflake,
  ArrowUpRight,
} from "lucide-react";
import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { Bottle, ProductGrid } from "@/components/scently/product";
import { DetailActions, Prices } from "@/components/scently/detail";
import { ReviewSection } from "@/components/scently/reviews";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = (await getCatalog()).find((f) => f.slug === slug);
  return {
    title: f ? `${f.brand} ${f.name}` : "Fragrance not found",
    description: f?.description,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    catalog = await getCatalog(),
    f = catalog.find((f) => f.slug === slug);
  if (!f) notFound();
  const user = await identity(),
    reviews = await getReviews(user?.id, f.id);
  const similar = catalog
    .filter(
      (v) => v.id !== f.id && v.accords.some((a) => f.accords.includes(a)),
    )
    .sort(
      (a, b) =>
        b.accords.filter((n) => f.accords.includes(n)).length -
        a.accords.filter((n) => f.accords.includes(n)).length,
    )
    .slice(0, 4);
  return (
    <main id="main" className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/fragrances">Fragrances</Link>
        <span>/</span>
        <span>{f.name}</span>
      </nav>
      <section className="detail-hero">
        <div className={"detail-image tone-" + f.family}>
          <Bottle fragrance={f} large />
          <span className="image-caption">
            {f.imageUrl ? "" : "Illustrated placeholder · not actual packaging"}
          </span>
        </div>
        <div className="detail-copy">
          <div className="eyebrow">{f.brand}</div>
          <h1>{f.name}</h1>
          <div className="detail-meta">
            <span>{f.concentration}</span>
            {f.year && <span>{f.year}</span>}
            {f.perfumer && <span>By {f.perfumer}</span>}
          </div>
          <p>{f.description}</p>
          <div className="rating">
            {f.rating
              ? `${f.rating.toFixed(1)} / 5 · ${f.reviewCount} reviews`
              : "A new discovery. Be the first to review."}
          </div>
          <div className="accord-tags">
            {f.accords.map((a) => (
              <Link key={a} href={"/fragrances?note=" + encodeURIComponent(a)}>
                {a}
              </Link>
            ))}
          </div>
          <DetailActions fragrance={f} />
          <a
            className="source-link"
            href={f.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {f.sourceName} <ArrowUpRight size={12} />
          </a>
          <p className="info-line">
            Facts checked{" "}
            {new Date(f.checkedAt).toLocaleDateString("en-CA", {
              timeZone: "UTC",
            })}
            . Description and scent categories are editorial summaries.
          </p>
        </div>
      </section>
      <nav className="detail-nav" aria-label="Fragrance sections">
        {[
          ["Scent profile", "profile"],
          ["Performance", "performance"],
          ["Reviews", "reviews"],
          ["Where to buy", "prices"],
        ].map(([s, id]) => (
          <a key={id} href={"#" + id}>
            {s}
          </a>
        ))}
      </nav>
      <section id="profile" className="detail-grid">
        <div className="panel">
          <h2>The scent, simply.</h2>
          <p>
            Editorial accord order, based on the listed composition. Bar lengths
            show order, not measured strength.
          </p>
          {f.accords.map((a, i) => (
            <div className="accord-row" key={a}>
              <span>{a}</span>
              <div className="accord-bar" aria-hidden="true">
                <div style={{ width: 100 - i * 15 + "%" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Fragrance pyramid</h2>
          <p>A scent unfolds in layers.</p>
          {(["top", "heart", "base", "unclassified"] as const)
            .filter(
              (stage) =>
                stage !== "unclassified" ||
                f.notes.some((n) => n.stage === stage),
            )
            .map((stage) => (
              <div className="pyramid-stage" key={stage}>
                <h3>
                  {stage === "unclassified"
                    ? "Additional disclosed notes"
                    : stage + " notes"}
                </h3>
                <p>
                  {stage === "top"
                    ? "The first impression"
                    : stage === "heart"
                      ? "The central character"
                      : stage === "base"
                        ? "The lingering impression"
                        : "The brand does not assign these notes to a pyramid."}
                </p>
                <div className="note-list">
                  {f.notes
                    .filter((n) => n.stage === stage)
                    .map((n) => (
                      <Link
                        key={n.name}
                        href={"/fragrances?note=" + encodeURIComponent(n.name)}
                      >
                        <Flower2 size={12} />
                        {n.name}
                      </Link>
                    ))}
                </div>
                {!f.notes.some((n) => n.stage === stage) && (
                  <p>Not classified by the source.</p>
                )}
              </div>
            ))}
        </div>
      </section>
      <section id="performance" className="detail-section">
        <h2>How it wears</h2>
        <div className="metrics">
          <div className="metric">
            <Clock size={24} />
            <h3>Longevity</h3>
            <strong>
              {f.longevity === null
                ? "Not enough data"
                : `${f.longevity} hours`}
            </strong>
            <p>
              {f.performanceVotes} reports · median wear time. Individual
              experience varies.
            </p>
          </div>
          <div className="metric">
            <Wind size={24} />
            <h3>Projection</h3>
            <strong>{f.projection || "Not enough data"}</strong>
            <p>
              Most common published community response. Projection describes how
              far a scent travels.
            </p>
          </div>
          <div className="metric">
            <Users size={24} />
            <h3>Evidence confidence</h3>
            <strong>
              {f.reviewCount >= 20
                ? "Established sample"
                : f.reviewCount
                  ? "Early impressions"
                  : "Awaiting reviews"}
            </strong>
            <p>
              {f.reviewCount} published reviews. Intensity has not been
              separately established.
            </p>
          </div>
        </div>
      </section>
      <section className="detail-section">
        <h2>A season for this scent</h2>
        <div className="season-row">
          {[
            { s: "spring", Icon: Flower2 },
            { s: "summer", Icon: Sun },
            { s: "fall", Icon: Leaf },
            { s: "winter", Icon: Snowflake },
          ].map(({ s, Icon }) => (
            <div
              key={s}
              className={
                "season " +
                (f.editorialSeasons.includes(s as never) ? "picked" : "")
              }
            >
              <Icon size={26} />
              <h3>{s}</h3>
              <p>
                {f.editorialSeasons.includes(s as never)
                  ? "Editorial pick"
                  : "Explore on your own terms"}
              </p>
              <p>{f.seasonVotes[s] || 0} community mentions</p>
            </div>
          ))}
        </div>
        <p className="info-line">
          Season preferences are subjective. Editorial picks are not voting
          percentages.
        </p>
        {f.occasions.length > 0 && (
          <p className="info-line">
            Editorial occasions: {f.occasions.join(" · ")}
          </p>
        )}
      </section>
      <section id="reviews" className="detail-section">
        <h2>Real experiences. Personal impressions.</h2>
        <ReviewSection initialReviews={reviews} fragranceId={f.id} />
      </section>
      <Prices fragrance={f} />
      {similar.length > 0 && (
        <section className="detail-section">
          <h2>Follow a familiar note</h2>
          <p className="info-line">
            These fragrances share one or more of {f.accords.join(", ")}. Shared
            notes are a starting point, not a promise of identical scent.
          </p>
          <ProductGrid fragrances={similar} />
        </section>
      )}
    </main>
  );
}
