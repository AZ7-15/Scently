import { getCatalog } from "@/lib/server/catalog";
import { Comparison } from "@/components/scently/comparison";
export const dynamic = "force-dynamic";
export const metadata = { title: "Compare fragrances" };
export default async function Page() {
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">A LITTLE PERSPECTIVE</div>
        <h1>
          Find your <em>point of difference.</em>
        </h1>
        <p>
          Compare up to three fragrances. Highlighted rows make the differences
          easier to spot.
        </p>
      </div>
      <Comparison catalog={await getCatalog()} />
    </main>
  );
}
