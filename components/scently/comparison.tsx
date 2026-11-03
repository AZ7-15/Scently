"use client";
import { useState, type FormEvent } from "react";
import { mergeFragrances } from "@/lib/catalog";
import Link from "@/components/scently/site-link";
import type { Fragrance } from "@/lib/domain";
import { sortedOffers, offerTotal } from "@/lib/discovery";
import { useScently } from "./shell";
import { ProductCard } from "./product";
export function Comparison({ catalog }: { catalog: Fragrance[] }) {
  const { compare, comparedRecords, toggleCompare, region } = useScently();
  const selected = mergeFragrances(catalog, comparedRecords).filter((f) =>
    compare.includes(f.id),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Fragrance[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search(more = false) {
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams({ q: more ? activeQuery : query.trim() });
      if (more && cursor) p.set("continuation", cursor);
      const response = await fetch("/api/catalog?" + p);
      const data = (await response.json()) as {
        results: Fragrance[];
        continuation: string | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Catalog search is unavailable.");
      setResults((old) =>
        more ? mergeFragrances(old, data.results) : data.results,
      );
      setCursor(data.continuation);
      if (!more) setActiveQuery(query.trim());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void search();
  }
  const rows: [string, (f: Fragrance) => string][] = [
    [
      "Rating",
      (f) =>
        f.rating
          ? `${f.rating.toFixed(1)} / 5 (${f.reviewCount})`
          : "Not enough data",
    ],
    ["Accords", (f) => f.accords.join(", ")],
    ...(["top", "heart", "base", "unclassified"] as const).map(
      (stage) =>
        [
          stage + " notes",
          (f: Fragrance) =>
            f.notes
              .filter((n) => n.stage === stage)
              .map((n) => n.name)
              .join(", ") || "Not disclosed",
        ] as [string, (f: Fragrance) => string],
    ),
    [
      "Longevity",
      (f) =>
        f.longevity === null ? "Not enough data" : f.longevity + " hours",
    ],
    ["Projection", (f) => f.projection || "Not enough data"],
    ["Editorial seasons", (f) => f.editorialSeasons.join(", ")],
    [
      "Current offer",
      (f) => {
        const o = sortedOffers(f.offers, region)[0];
        return o
          ? `${o.currency} $${offerTotal(o).toFixed(2)} · ${o.size} mL ${o.shipping === null ? "+ shipping " : ""}${o.tax === null ? "+ tax" : ""}`
          : "No current verified offer";
      },
    ],
  ];
  return (
    <>
      {selected.length < 3 && (
        <section className="comparison-catalog-search">
          <form className="search-box" onSubmit={submit}>
            <input
              aria-label="Search fragrances to compare"
              placeholder="Search the catalog by fragrance or brand..."
              value={query}
              maxLength={150}
              disabled={busy}
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]);
                setCursor(null);
              }}
            />
            <button
              className="button primary"
              disabled={busy || query.trim().length < 2}
            >
              Search catalog
            </button>
          </form>
          {error && <p role="alert">{error}</p>}
          <div className="comparison-search-results">
            {results
              .filter((f) => !compare.includes(f.id))
              .map((f) => (
                <button
                  key={f.id}
                  className="comparison-search-choice"
                  onClick={() => toggleCompare(f.id, f)}
                >
                  <span>
                    <strong>{f.name}</strong>
                    <small>
                      {f.brand} - {f.concentration}
                    </small>
                  </span>
                  <span>Add to comparison</span>
                </button>
              ))}
          </div>
          {cursor && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void search(true)}
            >
              More catalog results
            </button>
          )}
        </section>
      )}
      {selected.length ? (
        <>
          <p className="info-line">
            Shared accords:{" "}
            {selected[0].accords
              .filter((a) => selected.every((f) => f.accords.includes(a)))
              .join(", ") || "None across every selected fragrance"}
            .
          </p>
          <div className="compare-grid">
            {selected.map((f) => (
              <article className="comparison-card" key={f.id}>
                <ProductCard fragrance={f} />
                <div className="comparison-rows">
                  {rows.map(([label, get]) => (
                    <div
                      key={label}
                      className={
                        "comparison-row " +
                        (new Set(selected.map(get)).size > 1 ? "different" : "")
                      }
                    >
                      <strong>{label}</strong>
                      {get(f)}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2>Two scents. A clearer choice.</h2>
          <p>
            Select fragrances above, or use Compare while exploring the catalog.
          </p>
          <Link href="/fragrances" className="button primary">
            Explore fragrances
          </Link>
        </div>
      )}
    </>
  );
}
