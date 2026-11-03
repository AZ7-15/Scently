import { getLiveFragrance, FragranceSourceError } from "@/lib/server/scento";
import { detailedProfile } from "@/lib/server/fragrance-editorial";
import { curatedCatalog } from "@/data/catalog";
import { sameFragrance } from "@/lib/catalog";
import { FragranceStory } from "@/components/scently/fragrance-story";
import type { Note } from "@/lib/domain";
import Link from "@/components/scently/site-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Fragrance profile" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ lookup: string }>;
  searchParams: Promise<{
    name?: string;
    brand?: string;
    concentration?: string;
  }>;
}) {
  const { lookup } = await params;
  const result = await getLiveFragrance(lookup).then(
    (value) => ({ value, error: null }),
    (error: unknown) => ({ value: null, error }),
  );
  if (!result.value) return <ProfileFailure error={result.error} />;
  const expected = await searchParams;
  if (
    expected.name &&
    expected.brand &&
    !sameFragrance(
      {
        name: expected.name,
        brand: expected.brand,
        concentration: expected.concentration,
      },
      result.value,
    )
  )
    return (
      <ProfileFailure
        error={
          new FragranceSourceError(
            "The source returned a different fragrance or concentration. Its details have been withheld.",
            404,
          )
        }
      />
    );
  const f = await detailedProfile(result.value);
  const local = curatedCatalog.find(
    (item) => !!f.concentration && sameFragrance(item, f),
  );
  const notes: Note[] = (["top", "heart", "base"] as const).flatMap((stage) =>
    f.pyramid[stage].map((name) => ({ name, stage })),
  );
  for (const name of f.notes)
    if (!notes.some((n) => n.name.toLowerCase() === name.toLowerCase()))
      notes.push({ name, stage: "unclassified" });
  return (
    <FragranceStory
      profile={{
        ...f,
        imageUrl: local?.imageUrl || f.imageUrl,
        photoSourceUrl: local?.imageUrl ? local.sourceUrl : f.sourceUrl,
        notes,
        sourceName: f.source,
      }}
      communityLink={local ? "/fragrances/" + local.slug : undefined}
    />
  );
}
function ProfileFailure({ error: e }: { error: unknown }) {
  const unavailable = e instanceof FragranceSourceError && e.status === 404;
  return (
    <main id="main" className="container page">
      <section className="empty-state">
        <h1>
          {unavailable
            ? "This profile is not available."
            : "A pause in discovery."}
        </h1>
        <p>
          {e instanceof FragranceSourceError
            ? e.message
            : "We could not load this fragrance. Please try again."}
        </p>
        <Link className="button primary" href="/fragrances">
          Search the fragrance database
        </Link>
      </section>
    </main>
  );
}
