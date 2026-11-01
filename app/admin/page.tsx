import { getDb } from "@/db";
import { reports, aiUsage, retailers, audit } from "@/db/schema";
import { getCatalog, getReviews } from "@/lib/server/catalog";
import { identity } from "@/lib/server/security";
import { Admin } from "@/components/scently/admin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await identity();
  if (!user?.admin)
    return (
      <main id="main" className="container page">
        <div className="empty-state">
          <h1>Administrator access required.</h1>
          <p>This area is restricted to configured administrators.</p>
          {!user && (
            <a
              className="button primary"
              href="/signin-with-chatgpt?return_to=/admin"
              target="_top"
            >
              Sign in
            </a>
          )}
        </div>
      </main>
    );
  const db = getDb();
  const [catalog, reviewRows, reportRows, usage, retailerRows, auditRows] =
    await Promise.all([
      getCatalog(),
      getReviews(user.id, undefined, true),
      db.select().from(reports),
      db.select().from(aiUsage),
      db.select().from(retailers),
      db.select().from(audit),
    ]);
  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">SCENTLY STUDIO</div>
        <h1>
          Care for the <em>catalog.</em>
        </h1>
        <p>
          Source every fact. Protect authentic voices. Keep prices transparent.
        </p>
      </div>
      <Admin
        catalog={catalog}
        reviews={reviewRows}
        reports={reportRows}
        retailers={retailerRows}
        usage={{
          requests: usage.length,
          input: usage.reduce((n, r) => n + r.inputTokens, 0),
          output: usage.reduce((n, r) => n + r.outputTokens, 0),
        }}
        auditCount={auditRows.length}
      />
    </main>
  );
}
