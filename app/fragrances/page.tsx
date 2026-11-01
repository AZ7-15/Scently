import { getCatalog } from "@/lib/server/catalog";
import { Explorer } from "@/components/scently/explorer";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore fragrances" };
export default async function Page() {
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
          Find familiar favorites or something completely new. Explore by note,
          season, and the things that matter to you.
        </p>
      </div>
      <Explorer catalog={await getCatalog()} />
    </main>
  );
}
