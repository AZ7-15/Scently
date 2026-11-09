import { redirect } from "next/navigation";
import { ChangePassword } from "@/components/scently/change-password";
import Link from "@/components/scently/site-link";
import { identity } from "@/lib/server/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Change password" };

export default async function Page() {
  const user = await identity();
  if (!user) redirect("/login?return_to=/account/password");

  return (
    <main id="main" className="container page">
      <div className="page-intro">
        <div className="eyebrow">YOUR ACCOUNT</div>
        <h1>Change password</h1>
        <p>Update the password you use to sign in to Scently.</p>
      </div>
      <div className="detail-actions">
        <Link className="text-link" href="/account">Back to your account</Link>
      </div>
      <ChangePassword />
    </main>
  );
}
