import { concentrationKey } from "@/lib/catalog";
import { WearPerformance } from "./wear-performance";
import { researchedPerformance } from "@/lib/server/performance-research";
import type { WearEvidence } from "@/lib/wear-evidence";
import type { ReactNode } from "react";
import type { Note } from "@/lib/domain";
import { scentMood } from "@/lib/note-profiles";
import { ProductPhoto } from "./product-photo";
import { NotePyramid } from "./note-pyramid";
import Link from "./site-link";
import {
  Flower2,
  Sun,
  Leaf,
  Snowflake,
  ArrowDown,
  ArrowUpRight,
} from "lucide-react";
export type StoryProfile = {
  name: string;
  brand: string;
  concentration: string | null;
  year: number | null;
  perfumer: string | null;
  description: string;
  family: string;
  accords: string[];
  imageUrl: string | null;
  notes: Note[];
  seasons: string[];
  sourceUrl: string;
  photoSourceUrl?: string;
  detailSourceUrl?: string;
  sourceName: string;
  checkedAt: string;
  wearEvidence?: WearEvidence[];
  longevity?: number | null;
  projection?: string | null;
  performanceVotes?: number;
};
export function FragranceStory({
  profile: f,
  actions,
  children,
  community = false,
  photoCreditLabel,
  communityLink,
}: {
  profile: StoryProfile;
  actions?: ReactNode;
  children?: ReactNode;
  community?: boolean;
  photoCreditLabel?: string;
  communityLink?: string;
}) {
  const mood = scentMood(f.family);
  const concentrationLabels: Record<string, string> = {
    edp: "Eau de Parfum",
    edt: "Eau de Toilette",
    edc: "Eau de Cologne",
    extrait: "Extrait de Parfum",
    parfum: "Parfum",
    elixir: "Elixir",
  };
  const concentration =
    concentrationLabels[concentrationKey(f.concentration)] ||
    (f.concentration === "Not provided" ? null : f.concentration);
  const count = new Set(f.notes.map((n) => n.name.toLowerCase())).size;
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
            <ProductPhoto
              key={f.brand + f.name + f.concentration}
              name={f.name}
              brand={f.brand}
              concentration={f.concentration || ""}
              sourceUrl={f.photoSourceUrl || f.sourceUrl}
              imageUrl={f.imageUrl}
              creditLabel={photoCreditLabel}
              large
            />
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
            {concentration && <span>{concentration}</span>}
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
                <Link
                  href={"/fragrances?" + new URLSearchParams({ note: a })}
                  key={a}
                >
                  {a}
                </Link>
              ))}
          </div>
          <a href="#composition" className="button primary composition-button">
            Explore the composition <ArrowDown size={16} />
          </a>
          {actions && <div className="story-actions">{actions}</div>}
          <p className="story-small-print">
            An invitation to explore. Let your own skin tell the rest.
          </p>
        </div>
      </section>
      <nav className="fragrance-story-nav" aria-label="Fragrance sections">
        <a href="#composition">The composition</a>
        <a href="#season-story">When to wear</a>
        <a href="#performance">How it wears</a>
        <a href="#reviews">Reviews</a>
        <a href="#prices">Where to buy</a>
        <a href="#fragrance-sources">Sources & details</a>
      </nav>
      <NotePyramid notes={f.notes} />
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
                    {active
                      ? community
                        ? "Editorial pick"
                        : "Source suggested"
                      : "Explore for yourself"}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="quiet-note">
            Season guidance is subjective.{" "}
            {f.seasons.length
              ? community
                ? "Highlighted seasons are editorial suggestions, not community vote totals."
                : "Highlighted seasons are suggested by the source."
              : "The source has not supplied season guidance."}
          </p>
        </div>
      </section>
      <WearPerformance
        evidence={[...researchedPerformance(f), ...(f.wearEvidence || [])]}
        community={community ? f : undefined}
      />
      {children}
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
          {communityLink && (
            <p>
              <Link className="text-link" href={communityLink}>
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
              {f.sourceName}
            </a>
            .{" "}
            {f.sourceName.includes("Open Dataset")
              ? "Published snapshot"
              : "Retrieved"}{" "}
            {f.checkedAt.slice(0, 10)}.
          </p>
          {f.detailSourceUrl && f.detailSourceUrl !== f.sourceUrl && (
            <p>
              Additional composition details:{" "}
              <a
                href={f.detailSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Scento product profile
              </a>
              .
            </p>
          )}
          {f.sourceName.includes("Open Dataset") && (
            <p>
              Published-index content is adapted from{" "}
              <a
                href="https://www.scento.com/perfume-database"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scento
              </a>
              ,{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC BY 4.0
              </a>
              . Metadata is normalized for Scently. Live product content and
              images retain their separate source rights.
            </p>
          )}
          <p>
            Only the layers disclosed by the source are shown. Note descriptions
            are editorial guides to materials and accords, not additional
            ingredients. Wear time, prices and community ratings are shown only
            when available.
          </p>
        </details>
      </section>
    </main>
  );
}
