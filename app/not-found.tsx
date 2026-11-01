import Link from "@/components/scently/site-link";
export default function NotFound() {
  return (
    <main id="main" className="container page">
      <div className="empty-state">
        <h1>This scent trail ends here.</h1>
        <p>We couldn’t find that page. There’s still plenty to discover.</p>
        <Link className="button primary" href="/fragrances">
          Explore fragrances
        </Link>
      </div>
    </main>
  );
}
