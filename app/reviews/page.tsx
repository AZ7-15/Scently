import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { ReviewSection } from "@/components/scently/reviews";
export const dynamic = "force-dynamic";
export const metadata = { title: "Community reviews" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const [{ mine }, user, catalog] = await Promise.all([
    searchParams,
    identity(),
    getCatalog(),
  ]);
  const allReviews = await getReviews(user?.id);
  const mineOnly = mine === "1";
  const reviews = mineOnly
    ? allReviews.filter((review) => review.userId === user?.id)
    : allReviews;
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">{mineOnly ? "YOUR ACCOUNT" : "COMMUNITY REVIEWS"}</div>
        <h1>{mineOnly ? "Your reviews" : "Fragrance reviews"}</h1>
        <p>
          {mineOnly
            ? "Edit or delete reviews you have written."
            : "Honest impressions from people who have worn it. No fabricated ratings, no paid popularity."}
        </p>
      </div>
      <ReviewSection
        initialReviews={reviews}
        catalog={catalog}
        mineOnly={mineOnly}
        returnTo={mineOnly ? "/reviews?mine=1" : "/reviews"}
      />
    </main>
  );
}
