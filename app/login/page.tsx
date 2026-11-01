import { Login } from "@/components/scently/login";
import { safeReturnPath } from "@/lib/server/session";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  return (
    <main id="main" className="container page">
      <Login returnTo={safeReturnPath((await searchParams).return_to)} />
    </main>
  );
}
