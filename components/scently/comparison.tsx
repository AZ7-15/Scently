"use client";
import Link from "@/components/scently/site-link";
import type { Fragrance } from "@/lib/domain";
import { sortedOffers, offerTotal } from "@/lib/discovery";
import { useScently } from "./shell";
import { ProductCard } from "./product";
export function Comparison({ catalog }: { catalog: Fragrance[] }) {
  const { compare, toggleCompare, region } = useScently(),
    selected = catalog.filter((f) => compare.includes(f.id));
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
        <label className="field compare-select">
          <span>Add a fragrance</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) toggleCompare(e.target.value);
            }}
          >
            <option value="">Choose a scent</option>
            {catalog
              .filter((f) => !compare.includes(f.id))
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} · {f.name}
                </option>
              ))}
          </select>
        </label>
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
