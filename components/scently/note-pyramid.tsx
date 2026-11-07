import Link from "./site-link";
import { noteProfile } from "@/lib/note-profiles";
import { NotePortrait } from "./note-portrait";
import type { Note } from "@/lib/domain";
const stages = {
  top: {
    number: "01",
    title: "top notes",
    subtitle: "First to smell",
    description:
      "These are the first notes you smell after spraying. They fade before the other notes.",
  },
  heart: {
    number: "02",
    title: "heart notes",
    subtitle: "Main part of the scent",
    description:
      "These make up the main smell as the first notes fade.",
  },
  base: {
    number: "03",
    title: "base notes",
    subtitle: "Lasts the longest",
    description:
      "These notes stay on your skin after the other notes fade.",
  },
  unclassified: {
    number: "+",
    title: "Additional disclosed notes",
    subtitle: "More of the composition",
    description:
      "The source lists these notes without saying when they appear.",
  },
};
export function NotePyramid({
  notes,
  compact = false,
}: {
  notes: Note[];
  compact?: boolean;
}) {
  return (
    <section
      id="composition"
      className={"scent-composition " + (compact ? "compact" : "")}
    >
      <div className="composition-heading">
        <div>
          <span className="eyebrow">FRAGRANCE NOTES</span>
          <h2>Fragrance composition</h2>
        </div>
      </div>
      <div className="illustrated-pyramid">
        {(Object.keys(stages) as (keyof typeof stages)[])
          .filter(
            (stage) =>
              stage !== "unclassified" || notes.some((n) => n.stage === stage),
          )
          .map((stage) => {
            const info = stages[stage];
            const items = notes.filter((n) => n.stage === stage);
            return (
              <section className={"scent-layer layer-" + stage} key={stage}>
                <div className="layer-heading">
                  <span className="layer-number" aria-hidden="true">
                    {info.number}
                  </span>
                  <div>
                    <h3>{info.title}</h3>
                    <p>{info.subtitle}</p>
                  </div>
                </div>
                <p className="layer-explanation">{info.description}</p>
                <div className="ingredient-grid">
                  {items.map((note, i) => {
                    const profile = noteProfile(note.name);
                    return (
                      <Link
                        key={note.name + i}
                        className={"ingredient-card ingredient-" + profile.tone}
                        href={
                          "/fragrances?" +
                          new URLSearchParams({ note: note.name })
                        }
                        aria-label={note.name}
                      >
                        <NotePortrait name={note.name} />
                        <strong>{note.name}</strong>
                        <span>{profile.description}</span>
                        <small>
                          Explore this note{" "}
                          <span aria-hidden="true">&#8599;</span>
                        </small>
                      </Link>
                    );
                  })}
                </div>
                {!items.length && (
                  <p className="quiet-note">
                    The source has not assigned notes to this layer.
                  </p>
                )}
              </section>
            );
          })}
      </div>
      <p className="pyramid-footnote">
        Select a note to find more fragrances with it.
      </p>
      <details className="ingredient-credits">
        <summary>About the note imagery</summary>
        <p>
          Ingredient imagery comes from{" "}
          <a
            href="https://www.scento.com/notes"
            target="_blank"
            rel="noopener noreferrer"
          >
            Scento&apos;s note library
          </a>
          . Images illustrate scent notes; a perfume may recreate these
          impressions with aroma materials. Unavailable images are shown with a
          leaf marker.
        </p>
      </details>
    </section>
  );
}
