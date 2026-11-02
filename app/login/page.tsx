import { Login } from "@/components/scently/login";
import { safeReturnPath } from "@/lib/server/session";
import { databaseConfigured } from "@/lib/server/configuration";
import Link from "@/components/scently/site-link";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  if (!databaseConfigured())
    return (
      <main id="main" className="container page">
        <section className="empty-state">
          <h1>Keep exploring.</h1>
          <p>
            Accounts and saved collections are temporarily unavailable. You can
            still search fragrances and explore their notes.
          </p>
          <Link className="button primary" href="/fragrances">
            Explore fragrances
          </Link>
        </section>
      </main>
    );
  return (
    <main id="main" className="container page">
      <Login returnTo={safeReturnPath((await searchParams).return_to)} />
    </main>
  );
}
