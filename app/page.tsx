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
export const dynamic = "force-dynamic";
export default async function Home() {
  const catalog = await getCatalog();
  const portrait =
    catalog.find((f) => f.name === "Tobacco Vanille") || catalog[0];
  let featured = catalog.slice(0, 6);
  try {
    const source = (await searchUnifiedCatalog("")).results.filter(
      (f) => f.externalLookup,
    );
    if (source.length)
      featured = [...catalog.slice(0, 3), ...source.slice(0, 3)];
  } catch {
    /* The sourced starter selection remains available. */
  }
  const portraitNote =
    portrait?.notes.find((n) => n.name.toLowerCase() === "vanilla")?.name ||
    portrait?.notes[0]?.name;
  return (
    <main id="main" className="landing-story">
      <section className="landing-opening container">
        <div className="landing-opening-copy">
          <span className="eyebrow">SCENTLY / A WORLD OF FRAGRANCE</span>
          <h1>
            Find your scent.
            <br />
            <em>Follow the feeling.</em>
          </h1>
          <p className="landing-introduction">
            For the everyday you. The after-dark you. The version you
            haven&apos;t met yet. Discover a fragrance that feels personal.
          </p>
          <SearchBox catalog={catalog} large />
          <div className="landing-search-notes">
            <span>A place to begin</span>
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
          <p className="landing-caption">
            Real bottles. Notes you can picture. Room to discover.
          </p>
        </div>
        {portrait && (
          <div className="landing-portrait">
            <div className="landing-portrait-top">
              <span>THE SCENT EDIT</span>
              <span>01 / A WARMER SIDE</span>
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
                  A note to know<strong>{portraitNote}</strong>
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
          See the notes. Understand the layers.
        </span>
        <Link href="/finder">
          <Sparkles size={16} />A little guidance, when you need it{" "}
          <ArrowRight size={14} />
        </Link>
      </div>
      <section className="section container landing-moods">
        <div className="section-heading">
          <div>
            <span className="eyebrow">START WITH A FEELING</span>
            <h2>What are you drawn to?</h2>
          </div>
          <p>
            You don&apos;t need to know the names.
            <br />
            Just what makes you feel something.
          </p>
        </div>
        <div className="landing-mood-grid">
          {[
            {
              name: "Fresh & Clean",
              caption: "A breath of open air.",
              family: "fresh",
              note: "Bergamot",
              tone: "fresh",
            },
            {
              name: "Warm & Sweet",
              caption: "A little comfort, bottled.",
              family: "warm",
              note: "Vanilla",
              tone: "amber",
            },
            {
              name: "Woody & Grounded",
              caption: "Quiet depth. Natural texture.",
              family: "woody",
              note: "Sandalwood",
              tone: "woods",
            },
            {
              name: "Soft & Floral",
              caption: "Petals, with a point of view.",
              family: "floral",
              note: "Rose",
              tone: "floral",
            },
          ].map(({ name, caption, family, note, tone }, i) => (
            <Link
              key={family}
              className={"landing-mood mood-" + tone}
              href={"/fragrances?family=" + family}
            >
              <span className="landing-mood-number">0{i + 1}</span>
              <NotePortrait name={note} />
              <h3>{name}</h3>
              <p>{caption}</p>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section container landing-discoveries">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A FEW PLACES TO BEGIN</span>
            <h2>Meet your next possibility.</h2>
            <p>
              Different houses. Different characters. One small invitation to
              explore.
            </p>
          </div>
          <Link className="text-link" href="/fragrances">
            Explore all fragrances <ArrowRight size={16} />
          </Link>
        </div>
        <ProductGrid fragrances={featured} />
      </section>
      <section className="landing-note-story container">
        <div className="landing-note-art">
          <span className="eyebrow">A SCENT UNFOLDS IN LAYERS</span>
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
                      "A first impression",
                      "The central character",
                      "A deeper texture",
                    ][i]
                  }
                </small>
              </Link>
            ))}
          </div>
          <p>Three notes to explore. Every fragrance tells its own story.</p>
        </div>
        <div className="landing-note-copy">
          <span className="eyebrow">GET CLOSER TO THE COMPOSITION</span>
          <h2>
            More than a name
            <br />
            <em>on a bottle.</em>
          </h2>
          <p>
            See the ingredients behind the impression. Explore illustrated note
            pyramids, understand a scent&apos;s character, and follow the notes
            you love into something new.
          </p>
          <Link
            className="text-link"
            href={portrait ? fragrancePath(portrait) : "/fragrances"}
          >
            Step inside a fragrance <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="landing-guide container">
        <div>
          <span className="eyebrow">YOUR PERSONAL SCENT GUIDE</span>
          <h2>
            Start with a memory.
            <br />
            <em>Or just a maybe.</em>
          </h2>
          <p>
            A cosy evening. A fresh start. Something with vanilla that
            isn&apos;t too sweet. Tell us what you have in mind; we&apos;ll help
            you explore.
          </p>
          <Link className="button primary" href="/finder">
            Find a fragrance that feels like you <ArrowRight size={16} />
          </Link>
        </div>
        <div className="landing-guide-prompts">
          <span className="eyebrow">A LITTLE INSPIRATION</span>
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
        <span className="eyebrow">FOLLOW A HOUSE YOU LOVE</span>
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
