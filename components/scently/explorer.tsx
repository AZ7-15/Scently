"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { type Fragrance, seasons, projections } from "@/lib/domain";
import { searchCatalog, correctQuery, type Filters } from "@/lib/discovery";
import { ProductGrid } from "./product";
import { useScently } from "./shell";
export function Explorer({ catalog }: { catalog: Fragrance[] }) {
  const params = useSearchParams(),
    { region } = useScently();
  const initial: Filters = {
    q: params.get("q") || "",
    notes: params.getAll("note"),
    seasons: params.getAll("season"),
    family: params.get("family") || "",
    budget: Number(params.get("budget")) || undefined,
    minHours: Number(params.get("hours")) || undefined,
  };
  const [filters, setFilters] = useState(initial),
    [query, setQuery] = useState(initial.q || ""),
    [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: query }));
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);
  function change(key: keyof Filters, value: unknown) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  const result = searchCatalog(catalog, { ...filters, region });
  const select = (label: string, key: keyof Filters, values: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        value={String(filters[key] ?? "")}
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">Any</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <div className="filter-panel">
        <div className="search-box">
          <Search size={19} />
          <input
            aria-label="Search catalog"
            placeholder="Search fragrances, brands, or notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </div>
        <details open>
          <summary>
            <SlidersHorizontal size={16} /> Refine your discovery
          </summary>
          <div className="filter-grid">
            <label className="field">
              <span>Notes / accords</span>
              <select
                aria-label="Add a note"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    change("notes", [
                      ...new Set([...(filters.notes || []), e.target.value]),
                    ]);
                }}
              >
                <option value="">Add a note</option>
                {[
                  ...new Set(
                    catalog.flatMap((f) => [
                      ...f.accords,
                      ...f.notes.map((n) => n.name),
                    ]),
                  ),
                ]
                  .sort()
                  .map((n) => (
                    <option key={n}>{n}</option>
                  ))}
              </select>
            </label>
            <fieldset className="season-filter">
              <legend>Seasons</legend>
              {seasons.map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={filters.seasons?.includes(s) || false}
                    onChange={(e) =>
                      change(
                        "seasons",
                        e.target.checked
                          ? [...(filters.seasons || []), s]
                          : filters.seasons?.filter((v) => v !== s),
                      )
                    }
                  />
                  {s}
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span>Budget ({region === "CA" ? "CAD" : "USD"})</span>
              <input
                type="number"
                min="1"
                placeholder="Any price"
                value={filters.budget || ""}
                onChange={(e) =>
                  change("budget", Number(e.target.value) || undefined)
                }
              />
            </label>
            <label className="field">
              <span>Longevity, minimum hours</span>
              <input
                type="number"
                min="0.5"
                max="48"
                step="0.5"
                placeholder="Any duration"
                value={filters.minHours || ""}
                onChange={(e) =>
                  change("minHours", Number(e.target.value) || undefined)
                }
              />
            </label>
            {select("Projection", "projection", [...projections])}
          </div>
          <details className="more-filters">
            <summary>More filters</summary>
            <div className="filter-grid">
              {select("Brand", "brand", [
                ...new Set(catalog.map((f) => f.brand)),
              ])}
              {select("Concentration", "concentration", [
                ...new Set(catalog.map((f) => f.concentration)),
              ])}
              {select("Style preference", "style", [
                "masculine",
                "feminine",
                "all",
              ])}
              {select("Scent family", "family", [
                "fresh",
                "warm",
                "woody",
                "dark",
              ])}
              {select("Minimum rating", "minRating", ["3", "4", "4.5"])}
              {select("Occasion", "occasion", [
                "daily wear",
                "office",
                "date night",
                "formal",
                "school",
              ])}
            </div>
          </details>
        </details>
        <div className="filter-actions">
          <div className="chips">
            {filters.notes?.map((n) => (
              <button
                className="chip"
                key={n}
                onClick={() =>
                  change(
                    "notes",
                    filters.notes?.filter((v) => v !== n),
                  )
                }
              >
                {n}
                <X size={12} />
                <span className="sr-only">Remove note</span>
              </button>
            ))}
          </div>
          <button
            className="plain-button"
            onClick={() => {
              setFilters({});
              setQuery("");
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
      </div>
      {correctQuery(query) !== query && (
        <p className="info-line">
          Showing results for “{correctQuery(query)}”.
        </p>
      )}
      <div className="results-header">
        <span role="status">{result.length} fragrances found</span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort fragrances"
            value={filters.sort || ""}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="">Curated selection</option>
            <option value="name">Name</option>
            <option value="rating">Community rating</option>
          </select>
        </label>
      </div>
      {result.length ? (
        <ProductGrid fragrances={result.slice((page - 1) * 12, page * 12)} />
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h2>No scents found. Yet.</h2>
          <p>
            Try fewer filters or another note. Budget filters require current
            offers with known shipping; performance filters require community
            evidence.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setFilters({});
              setQuery("");
            }}
          >
            Explore all fragrances
          </button>
        </div>
      )}
      {result.length > 12 && (
        <div className="pagination">
          <button
            className="button"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(result.length / 12)}
          </span>
          <button
            className="button"
            disabled={page * 12 >= result.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
      <p className="quiet-note">
        Seasons and scent families are editorial suggestions. Performance and
        ratings come from published community reviews.
      </p>
    </>
  );
}
