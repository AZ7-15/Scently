import { FragranceStory } from "@/components/scently/fragrance-story";
import { notFound } from "next/navigation";
import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { RelatedFragrances } from "@/components/scently/related-fragrances";
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
  return (
    <FragranceStory
      profile={{
        ...f,
        seasons: f.editorialSeasons,
        photoSourceUrl: f.imageSourceUrl || f.sourceUrl,
      }}
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
      <section id="reviews" className="detail-section">
        <h2>Real experiences. Personal impressions.</h2>
        <ReviewSection initialReviews={reviews} fragranceId={f.id} />
      </section>
      <Prices fragrance={f} />
      <RelatedFragrances fragrance={f} />
    </FragranceStory>
  );
}
