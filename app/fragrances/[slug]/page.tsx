import { FragranceStory } from "@/components/scently/fragrance-story";
import { notFound } from "next/navigation";
import { Clock, Wind, Users } from "lucide-react";
import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { ProductGrid } from "@/components/scently/product";
import { DetailActions, Prices } from "@/components/scently/detail";
import { ReviewSection } from "@/components/scently/reviews";
import photos from "@/data/photo-sources.json";
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
    <FragranceStory
      profile={{ ...f, seasons: f.editorialSeasons }}
      community
      photoCreditLabel={
        photos.some(
          (photo) =>
            photo.id === f.id &&
            f.imageUrl === "/images/products/" + photo.file,
        )
          ? "Product photo \u00b7 manufacturer source"
          : undefined
      }
      actions={
        <>
          <p className="story-review-summary">
            {f.rating
              ? f.rating.toFixed(1) + " / 5 - " + f.reviewCount + " reviews"
              : "A new discovery. Be the first to review."}
          </p>
          <DetailActions fragrance={f} />
        </>
      }
    >
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
    </FragranceStory>
  );
}
