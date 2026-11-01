import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { ReviewSection } from "@/components/scently/reviews";
export const dynamic = "force-dynamic";
export const metadata = { title: "Community reviews" };
export default async function Page() {
  const user = await identity();
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">THE HUMAN SIDE OF SCENT</div>
        <h1>
          Every fragrance.
          <br />
          <em>A different experience.</em>
        </h1>
        <p>
          Honest impressions from people who have worn it. No fabricated
          ratings, no paid popularity.
        </p>
      </div>
      <ReviewSection
        initialReviews={await getReviews(user?.id)}
        catalog={await getCatalog()}
      />
    </main>
  );
}
