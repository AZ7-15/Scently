import Link from "@/components/scently/site-link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Compass,
  Flower2,
} from "lucide-react";
import { getCatalog } from "@/lib/server/catalog";
import { searchUnifiedCatalog } from "@/lib/server/unified-catalog";
import { ProductGrid } from "@/components/scently/product";
import { ProductPhoto } from "@/components/scently/product-photo";
import { NotePortrait } from "@/components/scently/note-portrait";
import { SearchBox } from "@/components/scently/search";
import { fragrancePath } from "@/lib/domain";
import { mergeFragrances } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function Home() {
  const catalog = await getCatalog();
  const powerfully = catalog.find(
    (f) => f.id === "stronger-with-you-powerfully",
  );
  const portrait =
    catalog.find((f) => f.name === "Tobacco Vanille") || powerfully || catalog[0];
  const otherLocal = catalog.filter((f) => f.id !== powerfully?.id);
  let featured = [
    ...(powerfully ? [powerfully] : []),
    ...otherLocal.slice(0, 5),
  ];
  try {
    const source = (await searchUnifiedCatalog("")).results.filter(
      (f) => f.externalLookup,
    );
    if (source.length)
      featured = mergeFragrances([], [
        ...(powerfully ? [powerfully] : []),
        ...source.slice(0, 3),
        ...otherLocal,
      ]).slice(0, 6);
  } catch {
    /* The sourced starter selection remains available. */
  }
  const portraitNote =
    portrait?.notes.find((n) => n.name.toLowerCase() === "vanilla")?.name ||
    portrait?.notes.find((n) => n.name.toLowerCase().includes("cherry"))?.name ||
    portrait?.notes[0]?.name;
  return (
    <main id="main" className="landing-story">
      <section className="landing-opening container">
        <div className="landing-opening-copy">
          <span className="eyebrow">SCENTLY</span>
          <h1>
            Find your fragrance.
            <br />
            <em>Follow the feeling.</em>
          </h1>
          <p className="landing-introduction">
            Search by fragrance, brand, or note, or tell the Finder what you
            want.
          </p>
          <SearchBox catalog={catalog} large />
          <div className="landing-search-notes">
            <span>Browse by</span>
            <Link href="/fragrances?note=Vanilla">Vanilla</Link>
            <Link href="/fragrances?note=Rose">Rose</Link>
            <Link href="/fragrances?brand=Lattafa">Lattafa</Link>
          </div>
          <div className="landing-actions">
            <Link className="button primary" href="/fragrances">
              Explore the catalog <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" href="/finder">
              <Sparkles size={16} />
              Find my fragrance
            </Link>
          </div>
        </div>
        {portrait && (
          <div className="landing-portrait">
            <div className="landing-portrait-top">
              <span>FEATURED FRAGRANCE</span>
            </div>
            <div className="landing-portrait-orbit" aria-hidden="true" />
            <div className="landing-portrait-product">
              <ProductPhoto
                name={portrait.name}
                brand={portrait.brand}
                concentration={portrait.concentration}
                imageUrl={portrait.imageUrl}
                sourceUrl={portrait.sourceUrl}
                large
              />
            </div>
            {portraitNote && (
              <Link
                className="landing-note-float"
                href={
                  "/fragrances?" + new URLSearchParams({ note: portraitNote })
                }
                aria-label={"Explore " + portraitNote + " fragrances"}
              >
                <NotePortrait name={portraitNote} />
                <span>
                  Note<strong>{portraitNote}</strong>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            )}
            <div className="landing-portrait-caption">
              <div>
                <span className="eyebrow">{portrait.brand}</span>
                <Link href={fragrancePath(portrait)}>{portrait.name}</Link>
              </div>
              <Link
                className="landing-portrait-link"
                href={fragrancePath(portrait)}
                aria-label={"Discover " + portrait.name}
              >
                <ArrowUpRight size={22} />
              </Link>
            </div>
          </div>
        )}
      </section>
      <div className="landing-wayfinding container">
        <Link href="/fragrances?sort=newest">
          <Compass size={16} />
          Explore new arrivals
        </Link>
        <span>
          <Flower2 size={16} />
          Learn about fragrance notes
        </span>
        <Link href="/finder">
          <Sparkles size={16} />Find a fragrance{" "}
          <ArrowRight size={14} />
        </Link>
      </div>
      <section className="section container landing-moods">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BROWSE BY SCENT STYLE</span>
            <h2>What kind of scent do you like?</h2>
          </div>
          <p>
            Choose a style to narrow the catalog.
          </p>
        </div>
        <div className="landing-mood-grid">
          {[
            {
              name: "Fresh & Clean",
              family: "fresh",
              note: "Bergamot",
              tone: "fresh",
            },
            {
              name: "Warm & Sweet",
              family: "warm",
              note: "Vanilla",
              tone: "amber",
            },
            {
              name: "Woody & Grounded",
              family: "woody",
              note: "Sandalwood",
              tone: "woods",
            },
            {
              name: "Soft & Floral",
              family: "floral",
              note: "Rose",
              tone: "floral",
            },
          ].map(({ name, family, note, tone }, i) => (
            <Link
              key={family}
              className={"landing-mood mood-" + tone}
              href={"/fragrances?family=" + family}
            >
              <span className="landing-mood-number">0{i + 1}</span>
              <NotePortrait name={note} />
              <h3>{name}</h3>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section container landing-discoveries">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FEATURED FRAGRANCES</span>
            <h2>Explore different brands.</h2>
          </div>
          <Link className="text-link" href="/fragrances">
            Explore all fragrances <ArrowRight size={16} />
          </Link>
        </div>
        <ProductGrid fragrances={featured} />
      </section>
      <section className="landing-note-story container">
        <div className="landing-note-art">
          <span className="eyebrow">TOP, HEART & BASE NOTES</span>
          <div>
            {["Bergamot", "Rose", "Sandalwood"].map((name, i) => (
              <Link
                href={"/fragrances?" + new URLSearchParams({ note: name })}
                className={"landing-note-step note-step-" + i}
                key={name}
              >
                <span>0{i + 1}</span>
                <NotePortrait name={name} />
                <strong>{name}</strong>
                <small>
                  {
                    [
                      "Top notes",
                      "Heart notes",
                      "Base notes",
                    ][i]
                  }
                </small>
              </Link>
            ))}
          </div>
        </div>
        <div className="landing-note-copy">
          <span className="eyebrow">FRAGRANCE NOTES</span>
          <h2>
            How a fragrance
            <br />
            changes over time
          </h2>
          <p>
            Top notes smell strongest first. Heart notes form the main scent.
            Base notes last the longest.
          </p>
          <Link
            className="text-link"
            href={portrait ? fragrancePath(portrait) : "/fragrances"}
          >
            Explore a fragrance profile <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="landing-guide container">
        <div>
          <span className="eyebrow">FRAGRANCE FINDER</span>
          <h2>
            Tell us what
            <br />
            you&apos;re looking for.
          </h2>
          <p>
            Describe the notes, mood, budget, or occasion you want. The Finder
            will suggest fragrances from the catalog.
          </p>
          <Link className="button primary" href="/finder">
            Find a fragrance <ArrowRight size={16} />
          </Link>
        </div>
        <div className="landing-guide-prompts">
          <span className="eyebrow">EXAMPLE REQUESTS</span>
          {[
            "Something warm, with vanilla, for winter evenings.",
            "A fresh fragrance with bergamot for everyday wear.",
            "A woody scent with sandalwood.",
          ].map((prompt) => (
            <Link
              key={prompt}
              href={"/finder?" + new URLSearchParams({ prompt })}
            >
              <span>{prompt}</span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="landing-house-list container">
        <span className="eyebrow">BROWSE BY BRAND</span>
        <div>
          {["Dior", "Le Labo", "Lattafa", "Xerjoff", "Armaf", "Amouage"].map(
            (brand) => (
              <Link
                key={brand}
                href={"/fragrances?" + new URLSearchParams({ brand })}
              >
                {brand}
              </Link>
            ),
          )}
        </div>
        <Link className="text-link" href="/fragrances">
          Discover more houses <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
