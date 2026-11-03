import { getLiveFragrance, FragranceSourceError } from "@/lib/server/scento";
import { detailedProfile } from "@/lib/server/fragrance-editorial";
import { curatedCatalog } from "@/data/catalog";
import { sameFragrance } from "@/lib/catalog";
import { scentMood } from "@/lib/note-profiles";
import { Bottle } from "@/components/scently/product";
import { ProductPhoto } from "@/components/scently/product-photo";
import { NotePyramid } from "@/components/scently/note-pyramid";
import type { Note } from "@/lib/domain";
import {
  Flower2,
  Sun,
  Leaf,
  Snowflake,
  ArrowDown,
  ArrowUpRight,
} from "lucide-react";
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
  const mood = scentMood(f.family);
  const notes: Note[] = (["top", "heart", "base"] as const).flatMap((stage) =>
    f.pyramid[stage].map((name) => ({ name, stage })),
  );
  for (const name of f.notes)
    if (!notes.some((n) => n.name.toLowerCase() === name.toLowerCase()))
      notes.push({ name, stage: "unclassified" });
  const count = new Set(notes.map((n) => n.name.toLowerCase())).size;
  return (
    <main
      id="main"
      className={"container page fragrance-editorial mood-" + mood.tone}
    >
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/fragrances">Fragrances</Link>
        <span>/</span>
        <span>{f.name}</span>
      </nav>
      <section className="fragrance-story-hero">
        <div className="fragrance-bottle-scene">
          <span className="scene-kicker">A SCENT TO REMEMBER</span>
          <span className="scene-orbit" aria-hidden="true" />
          <div className="scene-product">
            {local ? (
              <Bottle fragrance={local} large />
            ) : (
              <ProductPhoto
                key={lookup}
                name={f.name}
                brand={f.brand}
                concentration={f.concentration || ""}
                sourceUrl={f.sourceUrl}
                imageUrl={f.imageUrl}
                large
              />
            )}
          </div>
          <span className="scene-caption">
            {f.brand}
            <br />
            <em>{f.name}</em>
          </span>
        </div>
        <div className="fragrance-story-copy">
          <Link
            className="eyebrow"
            href={"/fragrances?" + new URLSearchParams({ brand: f.brand })}
          >
            {f.brand}
          </Link>
          <h1>{f.name}</h1>
          <div className="fragrance-facts">
            {f.concentration && <span>{f.concentration}</span>}
            {f.year && <span>{f.year}</span>}
            {f.perfumer && <span>By {f.perfumer}</span>}
            <span>{count} listed notes</span>
          </div>
          <p className="fragrance-mood-line">{mood.title}</p>
          <p className="fragrance-introduction">{f.description}</p>
          <div className="fragrance-character">
            {f.accords
              .filter((a) => a !== "Not provided")
              .slice(0, 6)
              .map((a) => (
                <span key={a}>{a}</span>
              ))}
          </div>
          <a href="#composition" className="button primary composition-button">
            Explore the composition <ArrowDown size={16} />
          </a>
          <p className="story-small-print">
            An invitation to explore. Let your own skin tell the rest.
          </p>
        </div>
      </section>
      <nav className="fragrance-story-nav" aria-label="Fragrance sections">
        <a href="#composition">The composition</a>
        <a href="#season-story">When to wear</a>
        <a href="#fragrance-sources">Sources & details</a>
      </nav>
      <NotePyramid notes={notes} />
      <section id="season-story" className="season-story">
        <div>
          <span className="eyebrow">FIND YOUR MOMENT</span>
          <h2>A feeling for the seasons.</h2>
          <p>
            Some scents feel like sunshine. Others feel like a favourite
            sweater. Start with the source&apos;s suggestions, then make it your
            own.
          </p>
        </div>
        <div>
          <div className="season-story-grid">
            {[
              { name: "spring", icon: Flower2, label: "Fresh starts" },
              { name: "summer", icon: Sun, label: "Sunlit days" },
              { name: "fall", icon: Leaf, label: "Golden hours" },
              { name: "winter", icon: Snowflake, label: "Cosy evenings" },
            ].map(({ name, icon: Icon, label }) => {
              const active =
                f.seasons.includes(name) ||
                (name === "fall" && f.seasons.includes("autumn"));
              return (
                <div
                  className={"season-story-card " + (active ? "suggested" : "")}
                  key={name}
                >
                  <Icon size={25} strokeWidth={1.2} />
                  <strong>{name}</strong>
                  <span>{label}</span>
                  <small>
                    {active ? "Source suggested" : "Explore for yourself"}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="quiet-note">
            Season guidance is subjective.{" "}
            {f.seasons.length
              ? "Highlighted seasons are suggested by the source."
              : "The source has not supplied season guidance."}
          </p>
        </div>
      </section>
      <section id="fragrance-sources" className="fragrance-story-footer">
        <div>
          <span className="eyebrow">KEEP FOLLOWING YOUR CURIOSITY</span>
          <h2>There is more to discover.</h2>
          <Link
            className="text-link"
            href={"/fragrances?" + new URLSearchParams({ brand: f.brand })}
          >
            Explore more from {f.brand} <ArrowUpRight size={16} />
          </Link>
          {local && (
            <p>
              <Link className="text-link" href={"/fragrances/" + local.slug}>
                Community reviews & collection
              </Link>
            </p>
          )}
        </div>
        <details className="profile-source-details">
          <summary>Sources & fragrance details</summary>
          <p>
            Composition and scent description:{" "}
            <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">
              Scento fragrance profile
            </a>
            . Retrieved {f.checkedAt.slice(0, 10)}.
          </p>
          <p>
            {f.detailed
              ? "The full listed pyramid is taken from the matching product page; signature-note summaries can be shorter."
              : "Only the layers disclosed by the source are shown."}
          </p>
          <p>
            Note descriptions are editorial guides to the materials and accords,
            not additional ingredients. Wear time, prices and community ratings
            are shown only when available.
          </p>
        </details>
      </section>
    </main>
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
