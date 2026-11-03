import Link from "./site-link";
import { noteProfile } from "@/lib/note-profiles";
import { NotePortrait } from "./note-portrait";
import type { Note } from "@/lib/domain";
const stages = {
  top: {
    number: "01",
    title: "top notes",
    subtitle: "The first impression",
    description:
      "The opening introduces the scent: the first textures you notice as it meets your skin.",
  },
  heart: {
    number: "02",
    title: "heart notes",
    subtitle: "The central character",
    description:
      "As the opening softens, the heart reveals the character at the centre of the composition.",
  },
  base: {
    number: "03",
    title: "base notes",
    subtitle: "The lingering impression",
    description:
      "The deeper textures of the composition shape its dry-down and the impression it leaves.",
  },
  unclassified: {
    number: "+",
    title: "Additional disclosed notes",
    subtitle: "More of the composition",
    description:
      "These notes are listed by the source without a specific pyramid stage.",
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
          <span className="eyebrow">THE ANATOMY OF A SCENT</span>
          <h2>Fragrance pyramid</h2>
        </div>
        <p>
          A first impression. A deeper connection.
          <br />A trace that feels like you.
        </p>
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
        Tap a note to find more fragrances with that character. Note
        descriptions describe the material or accord; your experience can vary.
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
