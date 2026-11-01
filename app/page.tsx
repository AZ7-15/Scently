import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Flower2,
  Leaf,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trees,
  Wind,
} from "lucide-react";
import { getCatalog } from "@/lib/server/catalog";
import { ProductGrid } from "@/components/scently/product";
import { SearchBox } from "@/components/scently/search";
export const dynamic = "force-dynamic";
export default async function Home() {
  const catalog = await getCatalog();
  return (
    <main id="main">
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span /> YOUR NEXT SIGNATURE SCENT STARTS HERE
          </div>
          <h1>
            Find your
            <br />
            perfect <em>fragrance.</em>
          </h1>
          <p className="hero-description">
            Explore scents, discover what people really think,
            <br className="desktop-break" /> and find the best price — all in
            one place.
          </p>
          <SearchBox catalog={catalog} large />
          <div className="search-examples">
            <span>Try</span>
            <Link href="/fragrances?q=vanilla">Vanilla</Link>
            <Link href="/fragrances?season=winter">Winter scents</Link>
            <Link href="/fragrances?q=sauvage">Dior Sauvage</Link>
          </div>
          <Link className="button primary" href="/finder">
            <Sparkles size={17} /> Find My Fragrance with AI{" "}
            <ArrowRight size={17} />
          </Link>
          <p className="hero-footnote">
            A little guidance. A fragrance that feels like you.
          </p>
        </div>
        <div className="hero-art">
          {/* Local decorative asset; no remote image service is required. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/fragrance-still-life.png"
            alt="Amber fragrance bottles beside olive branches on sunlit stone"
            fetchPriority="high"
          />
          <div className="hero-art-caption">
            <span>THE ART OF FINDING YOUR SCENT</span>
            <p>
              Something personal.
              <br />
              Something unmistakably you.
            </p>
            <span className="art-arrow">
              <ArrowUpRight size={24} />
            </span>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>
            <Compass size={17} /> Discover with confidence
          </span>
          <span>
            <Flower2 size={17} /> Understand every note
          </span>
          <span>
            <ShieldCheck size={17} /> Clear sources. Honest insights.
          </span>
        </div>
      </div>
      <section className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FOLLOW YOUR SENSES</div>
            <h2>What’s your kind of scent?</h2>
          </div>
          <p>No expertise needed. Start with a feeling.</p>
        </div>
        <div className="category-grid">
          {[
            {
              name: "Fresh & Clean",
              desc: "A breath of fresh air.",
              family: "fresh",
              Icon: Wind,
            },
            {
              name: "Warm & Sweet",
              desc: "Comfort, bottled.",
              family: "warm",
              Icon: Sun,
            },
            {
              name: "Woody & Masculine",
              desc: "Grounded. Quietly bold.",
              family: "woody",
              Icon: Trees,
            },
            {
              name: "Dark & Spicy",
              desc: "A little after-hours intrigue.",
              family: "dark",
              Icon: Moon,
            },
          ].map(({ name, desc, family, Icon }) => (
            <Link
              className={"category category-" + family}
              href={"/fragrances?family=" + family}
              key={family}
            >
              <Icon className="category-icon" strokeWidth={1} />
              <div>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="section container featured">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A GOOD PLACE TO START</div>
            <h2>Scents worth discovering</h2>
            <p>
              A small, considered selection. Find the one that speaks to you.
            </p>
          </div>
          <Link className="text-link" href="/fragrances">
            Explore all fragrances <ArrowRight size={17} />
          </Link>
        </div>
        <ProductGrid fragrances={catalog.slice(0, 6)} />
        <p className="quiet-note">
          Curated picks, not a popularity ranking. Community ratings appear as
          real reviews arrive.
        </p>
      </section>
      <section className="finder-banner container">
        <div className="finder-orbit" aria-hidden="true">
          <div />
          <div />
          <div />
          <Sparkles size={48} strokeWidth={1} />
          <span>YOUR SCENT, FOUND.</span>
        </div>
        <div>
          <div className="eyebrow">MEET YOUR PERSONAL SCENT GUIDE</div>
          <h2>
            Describe your ideal fragrance.
            <br />
            <em>We’ll help you find it.</em>
          </h2>
          <p>
            Notes, moods, memories. Tell us what you love and
            <br className="desktop-break" /> discover fragrances from our
            carefully sourced catalog.
          </p>
          <Link className="button cream" href="/finder">
            Let’s find your fragrance <ArrowRight size={17} />
          </Link>
        </div>
        <Link
          className="prompt-example"
          href="/finder?prompt=I%20want%20a%20masculine%20vanilla%20fragrance%20for%20winter"
        >
          <Sparkles size={17} />
          <p>
            “Something warm, a little vanilla.
            <br />
            Made for cold evenings.”
          </p>
          <span>
            Try this idea <ArrowUpRight size={15} />
          </span>
        </Link>
      </section>
      <section className="section container discovery">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A SCENT FOR EVERY CHAPTER</div>
            <h2>Make your next discovery</h2>
          </div>
        </div>
        <div className="discovery-grid">
          {[
            {
              label: "Sunshine in a bottle",
              caption: "Fresh picks for summer",
              url: "season=summer",
              Icon: Sun,
            },
            {
              label: "Sweater-weather scents",
              caption: "Warm picks for winter",
              url: "season=winter",
              Icon: Leaf,
            },
            {
              label: "A little luxury, for less",
              caption: "Verified offers under $100",
              url: "budget=100",
              Icon: Sparkles,
            },
            {
              label: "Leave a lasting impression",
              caption: "Community-reported longevity",
              url: "hours=8",
              Icon: Wind,
            },
          ].map(({ label, caption, url, Icon }) => (
            <Link key={label} href={"/fragrances?" + url}>
              <Icon strokeWidth={1.2} size={26} />
              <h3>{label}</h3>
              <p>{caption}</p>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
