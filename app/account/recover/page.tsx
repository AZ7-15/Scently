import { RecoverPassword } from "@/components/scently/recover-password";
import { databaseConfigured } from "@/lib/server/configuration";
import Link from "@/components/scently/site-link";

export const metadata = { title: "Reset password", robots: { index: false } };

export default function Page() {
  if (!databaseConfigured())
    return (
      <main id="main" className="container page">
        <section className="empty-state">
          <h1>Password reset is unavailable.</h1>
          <p>Account services are temporarily unavailable.</p>
          <Link className="button primary" href="/login">Back to sign in</Link>
        </section>
      </main>
    );

  return (
    <main id="main" className="container page">
      <RecoverPassword />
    </main>
  );
}
