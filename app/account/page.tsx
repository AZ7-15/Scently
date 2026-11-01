import Link from "next/link";
import { identity } from "@/lib/server/security";
import { getCatalog } from "@/lib/server/catalog";
import { Collection } from "@/components/scently/collection";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your personal shelf" };
export default async function Page() {
  const user = await identity();
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">YOUR PERSONAL SCENT STORY</div>
        <h1>
          A shelf of <em>possibilities.</em>
        </h1>
        <p>
          {user
            ? `Welcome, ${user.name}. Keep your favorites close, and your next discoveries closer.`
            : "A place for the scents you love, the ones you’ve tried, and everything you want to explore."}
        </p>
      </div>
      {user ? (
        <>
          <div className="detail-actions">
            <a
              className="plain-button"
              href="/signout-with-chatgpt?return_to=/"
              target="_top"
            >
              Sign out
            </a>
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
          <h2>Your scent story starts with you.</h2>
          <p>
            Sign in to save your wishlist and collection securely across visits.
            Email/password and Google sign-in are not configured for this
            deployment.
          </p>
          <a
            href="/signin-with-chatgpt?return_to=/account"
            target="_top"
            className="button primary"
          >
            Sign in with ChatGPT
          </a>
        </div>
      )}
    </main>
  );
}
