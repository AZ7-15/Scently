import Link from "@/components/scently/site-link";
import { identity } from "@/lib/server/security";
import { getCatalog } from "@/lib/server/catalog";
import { Collection } from "@/components/scently/collection";
import { databaseConfigured } from "@/lib/server/configuration";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your personal shelf" };
export default async function Page() {
  const user = await identity();
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">YOUR ACCOUNT</div>
        <h1>Saved fragrances</h1>
        <p>{user ? `Welcome, ${user.name}. Manage your saved fragrances and collection.` : "Sign in to save fragrances and manage your collection."}</p>
      </div>
      {user ? (
        <>
          <div className="detail-actions">
            <Link className="text-link" href="/reviews?mine=1">
              Manage your reviews
            </Link>
            <form method="post" action="/api/auth">
              <input type="hidden" name="action" value="logout" />
              <button className="plain-button">Sign out</button>
            </form>
            {user.admin && (
              <Link className="text-link" href="/admin">
                Administration
              </Link>
            )}
          </div>
          <Collection catalog={await getCatalog()} />
        </>
      ) : (
        <div className="empty-state">
          <h2>Sign in to view your saved fragrances.</h2>
          <p>
            {databaseConfigured()
              ? "Sign in to save your wishlist and collection securely across visits."
              : "Saved collections and accounts are temporarily unavailable. Fragrance browsing is available."}
          </p>
          <a
            href={
              databaseConfigured() ? "/login?return_to=/account" : "/fragrances"
            }
            target="_top"
            className="button primary"
          >
            {databaseConfigured() ? "Sign in" : "Explore fragrances"}
          </a>
        </div>
      )}
    </main>
  );
}
