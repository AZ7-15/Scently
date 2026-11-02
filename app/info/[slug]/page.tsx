import Link from "@/components/scently/site-link";
import { notFound } from "next/navigation";
import { brandConfig } from "@/lib/domain";
import { setting } from "@/lib/server/security";
import { curatedCatalog } from "@/data/catalog";
import photos from "@/data/photo-sources.json";
const pages: Record<
  string,
  { title: string; sections: { title: string; text: string }[] }
> = {
  about: {
    title: "A little clarity. A world of scent.",
    sections: [
      {
        title: "Discover thoughtfully",
        text: "Scently brings fragrance notes, personal experiences, and transparent retailer information into one calm place. Start with a name, a note, or a feeling.",
      },
      {
        title: "A growing catalog",
        text: "Our starter catalog contains six manually checked fragrances. Catalog expansion is in progress. Each profile identifies its sources; a complete Fragrantica catalog has not been imported.",
      },
    ],
  },
  "data-sources": {
    title: "Know what’s behind the notes.",
    sections: [
      {
        title: "Fragrance facts",
        text: "Names, concentrations and disclosed notes are manually checked against manufacturer information. Each profile links to its source and records when it was checked. Descriptions are original summaries. Notes remain unclassified when the source does not assign top, heart, and base stages.",
      },
      {
        title: "Live fragrance lookups",
        text: "The catalog combines local records with on-demand Scento Perfume API results in the same search and filters. Duplicate brand, name and concentration records preserve local reviews. Source families are mapped into common scent categories. Filters use the data available for loaded records; missing measurements are not guessed. Brand suggestions do not promise complete coverage, and the source does not contain every fragrance worldwide.",
      },
      {
        title: "Editorial guidance",
        text: "Accord order, scent families and season picks are editorial interpretations of the disclosed composition. Accord bars show order, not measured percentages. Product photos use manufacturer assets or matching source product photographs, with source links on profiles. If a reliable photo cannot be found, it is labeled unavailable rather than showing another fragrance.",
      },
      {
        title: "Community evidence",
        text: "Ratings are the arithmetic mean of published reviews. Longevity is the median of reported hours. Projection is the most frequent reported category; ties follow the first reported category. Season counts are mentions, not suitability percentages. Fewer than 20 reviews are labeled early impressions. No reviews or performance measurements are seeded.",
      },
      {
        title: "Finder methodology",
        text: "Candidate scoring uses notes 30, longevity 20, projection 20, season 10, budget 10, and style 10; occasion adds a separate 10 when requested. Only requested dimensions enter the score. Excluded notes remove records. All unmet preferences are disclosed; exact matches require every requested preference, including current total price evidence, to be satisfied. Scores are used internally, not shown as scientific match percentages.",
      },
      {
        title: "Prices and partnerships",
        text: "Retailer listings must identify their source and verification time. Offers expire after 48 hours. Unknown shipping or tax is never called a final total. There are no automated retailer feeds or affiliate partnerships enabled in the initial release. Public availability of a brand page does not grant rights to reuse its photographs or marketing copy.",
      },
    ],
  },
  faq: {
    title: "A few good questions.",
    sections: [
      {
        title: "Do I need an account?",
        text: "Browsing, comparing, and using the finder are free of an account requirement. Sign in to save your collection or contribute reviews.",
      },
      {
        title: "Why is performance sometimes missing?",
        text: "We show community evidence when it exists. Skin, application and environment can change an experience. Missing reports are shown as missing data, not guessed values.",
      },
      {
        title: "Can anyone wear these fragrances?",
        text: "Yes. Masculine and feminine are descriptive style preferences, not rules about who may wear a fragrance.",
      },
      {
        title: "Why aren’t there always prices?",
        text: "An offer needs a source, region, currency and recent verification. If none is available, we provide retailer directory links without implying availability or a price.",
      },
      {
        title: "Is the finder always AI?",
        text: "Its status badge tells you. When the AI service is not connected or unavailable, a limited rule-based interpreter is used. Recommendations always come from our catalog.",
      },
    ],
  },
  privacy: {
    title: "Your shelf. Your choices.",
    sections: [
      {
        title: "What this app stores",
        text: "When you sign in, this app stores your site-specific user identifier and display name, reviews, votes, reports and collection entries. Reviews and display names are visible to other visitors. Your collection is private to your account.",
      },
      {
        title: "Preferences and local storage",
        text: "Your region and comparison selection are stored in your browser. Finder conversation preferences stay in page memory and are cleared on refresh. No persistent AI preference profile is saved.",
      },
      {
        title: "When AI is connected",
        text: "Your finder message and structured preferences are sent to the configured OpenAI service for interpretation. The request disables response storage. This does not promise zero retention by the service provider. We log model name and token counts for operations, not prompt content.",
      },
      {
        title: "Account controls",
        text: "You can edit or delete your reviews, remove shelf items, and sign out. Contact the site operator for account data requests. Accounts store your email address and a salted password hash. Sessions use an HTTP-only cookie and expire after 30 days.",
      },
    ],
  },
  terms: {
    title: "Explore with care.",
    sections: [
      {
        title: "About this initial release",
        text: "Scently provides discovery information and community opinions. Fragrance preferences and performance are subjective. Availability and retailer totals can change; check the retailer’s terms before buying.",
      },
      {
        title: "Community contributions",
        text: "Share your own experiences and content you have the right to publish. Do not post harassment, private information, spam, or deceptive promotions. Moderators may hide or review contributions and reports.",
      },
      {
        title: "Retailer transactions",
        text: "Scently does not sell fragrances or process payments. Any purchase is made directly with the retailer, under that retailer’s policies.",
      },
    ],
  },
  "affiliate-disclosure": {
    title: "Clear recommendations. Clear relationships.",
    sections: [
      {
        title: "The current release",
        text: "No affiliate partnerships are currently configured. The retailer directory links are ordinary external links.",
      },
      {
        title: "If affiliate offers are added",
        text: "Approved affiliate offers will be clearly labeled. We may receive a commission from qualifying purchases. Rankings use documented scent preferences and verified offer data; commission does not enter the ranking algorithm.",
      },
    ],
  },
  contact: {
    title: "Help us make scent clearer.",
    sections: [
      {
        title: "Corrections and feedback",
        text: "Spotted an incorrect note or an outdated listing? Include the fragrance name and a reliable source when contacting the site operator.",
      },
      {
        title: "Review concerns",
        text: "Use the Report action beside a review to send a concern to the moderation queue.",
      },
    ],
  },
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return { title: pages[(await params).slug]?.title || "Information" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    p = pages[slug];
  if (!p) notFound();
  const contact = setting("CONTACT_EMAIL");
  return (
    <main id="main" className="container page prose">
      <div className="eyebrow">{brandConfig.name} · THOUGHTFUL BY DESIGN</div>
      <h1>{p.title}</h1>
      {p.sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.text}</p>
        </section>
      ))}
      {slug === "data-sources" && (
        <section>
          <h2>Manufacturer references</h2>
          <ul>
            {curatedCatalog.map((f) => (
              <li key={f.id}>
                <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {f.brand} · {f.name}
                </a>
              </li>
            ))}
          </ul>
          <h2>Product photo sources</h2>
          <p>
            Product photographs belong to their respective rights holders.
            Source attribution does not imply a brand partnership or a
            commercial image license.
          </p>
          <ul>
            {photos.map((photo) => (
              <li key={photo.id}>
                <a
                  href={photo.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {curatedCatalog.find((f) => f.id === photo.id)?.name}
                </a>{" "}
                · checked {photo.checkedAt}
              </li>
            ))}
          </ul>
        </section>
      )}
      {slug === "contact" &&
        (contact ? (
          <p>
            <a href={"mailto:" + contact}>{contact}</a>
          </p>
        ) : (
          <p className="info-line">
            Direct contact is not available yet. Review reports remain available
            to signed-in visitors.
          </p>
        ))}
      <p className="detail-section">
        <Link href="/fragrances">Continue exploring →</Link>
      </p>
    </main>
  );
}
