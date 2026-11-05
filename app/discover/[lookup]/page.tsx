import { redirect } from "next/navigation";
import { Prices } from "@/components/scently/detail";
import { CatalogDetailActions } from "@/components/scently/catalog-detail-actions";
import { RelatedFragrances } from "@/components/scently/related-fragrances";
import { getOpenProfile } from "@/lib/server/open-catalog";
import { getOpenCatalog } from "@/lib/server/open-catalog";
import {
  getLiveFragrance,
  searchLiveFragrances,
  FragranceSourceError,
} from "@/lib/server/scento";
import { detailedProfile } from "@/lib/server/fragrance-editorial";
import { curatedCatalog } from "@/data/catalog";
import photoSources from "@/data/photo-sources.json";
import { matchingCatalogEdition } from "@/lib/catalog";
import { FragranceStory } from "@/components/scently/fragrance-story";
import { ReviewSection } from "@/components/scently/reviews";
import { identity } from "@/lib/server/security";
import {
  getCatalog,
  getReviews,
  saveFragrance,
} from "@/lib/server/catalog";
import { databaseConfigured } from "@/lib/server/configuration";
import {
  fragrancePath,
  slugify,
  type Fragrance,
  type Note,
} from "@/lib/domain";
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
  const expected = await searchParams;
  const expectedIdentity =
    expected.name && expected.brand
      ? {
          name: expected.name,
          brand: expected.brand,
          concentration: expected.concentration,
        }
      : null;
  let profile: Awaited<ReturnType<typeof getLiveFragrance>> | null = null;
  let loadError: unknown = null;
  try {
    profile = lookup.startsWith("open:")
      ? await getOpenProfile(lookup)
      : await getLiveFragrance(lookup);
    if (!profile && lookup.startsWith("open:"))
      loadError = new FragranceSourceError(
        "This published profile is unavailable.",
        404,
      );
  } catch (error) {
    loadError = error;
  }
  if (
    expectedIdentity &&
    profile &&
    !matchingCatalogEdition(expectedIdentity, profile)
  )
    profile = null;
  if (!profile && expectedIdentity) {
    const savedCatalog = await getCatalog().catch(() => curatedCatalog);
    const decodeLookup = (value: string) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    const saved =
      savedCatalog.find(
        (candidate) =>
          decodeLookup(candidate.slug) === decodeLookup(lookup) &&
          matchingCatalogEdition(expectedIdentity, candidate),
      ) ||
      savedCatalog.find((candidate) =>
        matchingCatalogEdition(expectedIdentity, candidate),
      );
    if (saved) redirect(fragrancePath(saved));

    const indexed = (await getOpenCatalog()).find((candidate) =>
      matchingCatalogEdition(expectedIdentity, candidate),
    );
    if (indexed?.externalLookup) {
      const query = new URLSearchParams({
        name: indexed.name,
        brand: indexed.brand,
        concentration: indexed.concentration,
      });
      redirect(
        "/discover/" + encodeURIComponent(indexed.externalLookup) + "?" + query,
      );
    }

    if (!lookup.startsWith("open:")) {
      const alternate = await searchLiveFragrances(
        expectedIdentity.name + " " + expectedIdentity.brand,
      ).catch(() => null);
      const matches = (alternate?.matches || []).filter((candidate) =>
        matchingCatalogEdition(expectedIdentity, {
          name: candidate.name,
          brand: candidate.brand,
          concentration: null,
        }),
      );
      const verified = await Promise.all(
        matches.slice(0, 5).map(async (candidate) => {
          const result = await getLiveFragrance(candidate.lookup).catch(
            () => null,
          );
          return result && matchingCatalogEdition(expectedIdentity, result)
            ? { candidate, profile: result }
            : null;
        }),
      );
      const match = verified.find((candidate) => !!candidate);
      if (match && match.candidate.lookup !== lookup) {
        const query = new URLSearchParams({
          name: expectedIdentity.name,
          brand: expectedIdentity.brand,
          concentration: expectedIdentity.concentration || "",
        });
        redirect(
          "/discover/" +
            encodeURIComponent(match.candidate.lookup) +
            "?" +
            query,
        );
      }
      if (match) profile = match.profile;
    }
    loadError ||= new FragranceSourceError(
      "The matching fragrance edition was not found in the available sources.",
      404,
    );
  }
  if (!profile) return <ProfileFailure error={loadError} />;
  const f = await detailedProfile(profile);
  const photoLookup = (() => {
    try {
      return decodeURIComponent(lookup);
    } catch {
      return lookup;
    }
  })();
  const storedPhoto = photoSources.find(
    (photo) => photoLookup === "open:" + photo.id,
  );
  const photoUrl =
    f.imageUrl || (storedPhoto ? "/images/products/" + storedPhoto.file : null);
  const photoSourceUrl =
    f.imageSourceUrl || storedPhoto?.source || f.sourceUrl;
  const local = curatedCatalog.find(
    (item) => !!f.concentration && matchingCatalogEdition(item, f),
  );
  if (local) redirect("/fragrances/" + local.slug);
  const notes: Note[] = (["top", "heart", "base"] as const).flatMap((stage) =>
    f.pyramid[stage].map((name) => ({ name, stage })),
  );
  for (const name of f.notes)
    if (!notes.some((n) => n.name.toLowerCase() === name.toLowerCase()))
      notes.push({ name, stage: "unclassified" });
  const record: Fragrance = {
    ...f,
    imageUrl: photoUrl,
    imageSourceUrl: photoSourceUrl,
    id: lookup.startsWith("open:")
      ? "open-" + lookup.slice(5)
      : "scento-" +
        slugify(
          f.brand + "-" + f.name + "-" + (f.concentration || "Not provided"),
        ),
    slug: lookup,
    externalLookup: lookup,
    concentration: f.concentration || "Not provided",
    style: "unknown",
    color: "#b7a47d",
    shape: "round",
    family: f.family,
    notes,
    editorialSeasons: f.seasons
      .map((v) => (v === "autumn" ? "fall" : v))
      .filter((s): s is "spring" | "summer" | "fall" | "winter" =>
        ["spring", "summer", "fall", "winter"].includes(s),
      ),
    occasions: [],
    sourceName: f.source,
    demo: false,
    rating: null,
    reviewCount: 0,
    longevity: null,
    projection: null,
    performanceVotes: 0,
    seasonVotes: {},
    offers: [],
  };
  // Persist source-verified editions when a database is configured so their
  // community reviews have a stable fragrance record to attach to.
  if (databaseConfigured()) await saveFragrance(record, false);
  const user = await identity();
  const reviews = await getReviews(user?.id, record.id);
  return (
    <FragranceStory
      profile={{
        ...f,
        imageUrl: photoUrl,
        photoSourceUrl,
        notes,
        sourceName: f.source,
      }}
      actions={<CatalogDetailActions fragrance={record} />}
    >
      <section id="reviews" className="detail-section">
        <h2>Real experiences. Personal impressions.</h2>
        <ReviewSection
          initialReviews={reviews}
          fragranceId={record.id}
          returnTo={
            "/discover/" +
            encodeURIComponent(lookup) +
            "?" +
            new URLSearchParams({
              name: f.name,
              brand: f.brand,
              concentration: f.concentration || "",
            })
          }
        />
      </section>
      <Prices fragrance={record} />
      <RelatedFragrances fragrance={record} />
    </FragranceStory>
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
