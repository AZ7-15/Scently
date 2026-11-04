import { Finder } from "@/components/scently/finder";
import { setting } from "@/lib/server/security";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your personal fragrance finder" };
export default function Page() {
  return (
    <main id="main" className="container page">
      <Finder configured={!!setting("GEMINI_API_KEY")} />
    </main>
  );
}
