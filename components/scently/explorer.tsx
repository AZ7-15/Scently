"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { type Fragrance, seasons, projections } from "@/lib/domain";
import { searchCatalog, correctQuery, type Filters } from "@/lib/discovery";
import { ProductGrid } from "./product";
import { useScently } from "./shell";
import { mergeFragrances } from "@/lib/catalog";
import { catalogFilters, catalogParameters } from "@/lib/catalog-filters";
type CatalogResponse = {
  results: Fragrance[];
  continuation: string | null;
  providerTotal: number;
  error?: string;
  notice?: string;
};
export function Explorer({
  catalog,
  brands = [],
  noteOptions = [],
  initialCatalog = catalog,
  initialContinuation = null,
  initialProviderTotal = 0,
  initialNotice = "",
}: {
  catalog: Fragrance[];
  brands?: string[];
  noteOptions?: string[];
  initialCatalog?: Fragrance[];
  initialContinuation?: string | null;
  initialProviderTotal?: number;
  initialNotice?: string;
}) {
  const params = useSearchParams(),
    { region } = useScently();
  const initial: Filters = catalogFilters(
    new URLSearchParams(params.toString()),
  );
  const [filters, setFilters] = useState(initial),
    [query, setQuery] = useState(initial.q || ""),
    [page, setPage] = useState(1);
  const [records, setRecords] = useState(catalog),
    [activeQuery, setActiveQuery] = useState(
      initialNotice ? "" : initial.q || "",
    ),
    [cursor, setCursor] = useState(initialContinuation),
    [providerTotal, setProviderTotal] = useState(initialProviderTotal),
    [notice, setNotice] = useState(initialNotice),
    [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  function reset() {
    clearTimeout(searchTimer.current);
    requestId.current++;
    setFilters({});
    setQuery("");
    setActiveQuery("");
    setRecords(initialCatalog);
    setCursor(null);
    setProviderTotal(0);
    setNotice("");
    setBusy(false);
    setPage(1);
    window.history.replaceState(null, "", "/fragrances");
    void search("", false, true, {});
  }
  async function search(
    value = query,
    more = false,
    clearFilters = false,
    nextFilters = filters,
  ) {
    clearTimeout(searchTimer.current);
    const criteria: Filters = clearFilters
      ? { q: value }
      : { ...nextFilters, q: value };
    const q = value.trim();
    if ((q.length > 0 && q.length < 2) || q.length > 150) {
      setNotice("Search using 2–150 characters.");
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    setNotice("");
    setQuery(q);
    try {
      const parameters = catalogParameters({ ...criteria, region }, q);
      if (more && cursor) parameters.set("continuation", cursor);
      const response = await fetch("/api/catalog?" + parameters);
      const data = (await response.json()) as CatalogResponse;
      if (id !== requestId.current) return;
      if (!response.ok)
        throw new Error(
          data.error || "Fragrance search is temporarily unavailable.",
        );
      const combined = more
        ? mergeFragrances(records, data.results)
        : data.results;
      setRecords(combined);
      setCursor(data.continuation);
      setProviderTotal(data.providerTotal);
      setNotice(data.notice || "");
      setActiveQuery(q);
      setQuery(q);
      setPage(more ? Math.max(1, Math.ceil(combined.length / 12)) : 1);
      setFilters(criteria);
      window.history.replaceState(
        null,
        "",
        "/fragrances?" + catalogParameters(criteria, q),
      );
    } catch (e) {
      if (id === requestId.current) setNotice((e as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, q: query }));
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);
  function change(key: keyof Filters, value: unknown) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    schedule(query, next);
  }
  function schedule(value: string, next: Filters) {
    clearTimeout(searchTimer.current);
    requestId.current++;
    searchTimer.current = setTimeout(
      () => void search(value, false, false, next),
      500,
    );
  }
  const result = searchCatalog(records, {
    ...filters,
    q: filters.q,
    region,
  });
  const select = (label: string, key: keyof Filters, values: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
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
        <form className="search-box" action="/fragrances" onSubmit={submit}>
          <Search size={19} />
          <input
            aria-label="Search catalog"
            name="q"
            placeholder="Search fragrances, brands, or notes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              schedule(e.target.value, filters);
            }}
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={reset}>
              <X size={16} />
            </button>
          )}
          <button
            className="catalog-search-submit"
            disabled={busy}
            aria-label="Search database"
          >
            {busy ? "Searching…" : <ArrowRight size={18} />}
          </button>
        </form>
        <details open>
          <summary>
            <SlidersHorizontal size={16} /> Refine your discovery
          </summary>
          <div className="filter-grid">
            {select(
              "Brand",
              "brand",
              [
                ...new Set([
                  ...brands,
                  ...initialCatalog.map((f) => f.brand),
                  ...records.map((f) => f.brand),
                ]),
              ].sort(),
            )}
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
                  ...new Set([
                    ...noteOptions,
                    "Floral",
                    "Woody",
                    "Fresh",
                    "Amber",
                    "Vanilla",
                    "Rose",
                    "Jasmine",
                    "Oud",
                    "Musk",
                    "Bergamot",
                    "Tobacco",
                    "Sandalwood",
                    "Lavender",
                    "Citrus",
                    ...[...initialCatalog, ...records].flatMap((f) => [
                      ...f.accords,
                      ...f.notes.map((n) => n.name),
                    ]),
                  ]),
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
              {select("Concentration", "concentration", [
                ...new Set([
                  "Eau de Parfum",
                  "Eau de Toilette",
                  "Parfum",
                  "Extrait de Parfum",
                  ...records.map((f) => f.concentration),
                ]),
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
                "floral",
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
          <button className="plain-button" onClick={reset}>
            Reset filters
          </button>
        </div>
      </div>
      {notice && (
        <div className="info-line" role="alert">
          <p>{notice}</p>
          <button
            className="plain-button"
            disabled={busy}
            onClick={() => void search()}
          >
            Try search again
          </button>
        </div>
      )}
      {busy && <p role="status">Searching fragrances…</p>}
      {providerTotal > 0 && (
        <p className="quiet-note">
          The live storefront reports {providerTotal.toLocaleString()}{" "}
          candidates.{" "}
          {filters.sort !== "newest" &&
            "Published-index records are also included. "}
          Every page uses your selected filters.
        </p>
      )}
      {filters.sort === "newest" && (
        <p className="quiet-note">
          Recently added by the live source. A new arrival can be an older
          fragrance newly stocked; launch dates are only shown when supplied.
        </p>
      )}
      {correctQuery(query) !== query && (
        <p className="info-line">
          Showing results for “{correctQuery(query)}”.
        </p>
      )}
      <div className="results-header">
        <span role="status">
          {result.length} fragrances{" "}
          {cursor ? "shown; more results available" : "found"}
        </span>
        <label>
          Sort by{" "}
          <select
            aria-label="Sort fragrances"
            value={filters.sort || "popular"}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="popular">Popularity</option>
            <option value="newest">New arrivals</option>
            <option value="name">Name</option>
            <option value="rating">Community rating</option>
          </select>
        </label>
      </div>
      {result.length ? (
        <ProductGrid fragrances={result.slice(0, page * 12)} />
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h2>
            {cursor ? "No matches on this page." : "No scents found. Yet."}
          </h2>
          <p>
            {cursor && "More catalog pages remain available below. "}Try fewer
            filters or another note. Budget filters require current offers with
            known shipping; performance filters require community evidence.
          </p>
          <button className="button secondary" onClick={reset}>
            Explore all fragrances
          </button>
        </div>
      )}
      {result.length > page * 12 && (
        <div className="pagination">
          <button
            className="button"
            disabled={page * 12 >= result.length}
            onClick={() => setPage(page + 1)}
          >
            Show more fragrances
          </button>
        </div>
      )}
      {cursor && (
        <button
          className="button secondary live-load-more"
          disabled={busy}
          onClick={() => void search(activeQuery, true)}
        >
          Load more fragrances
        </button>
      )}
      <p className="quiet-note">
        Published index adapted from{" "}
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
        . Fields are normalized for Scently; image rights remain separate.
      </p>
      <p className="quiet-note">
        Popularity order uses Scento's published best-known rank when available.
        Items without a matching rank follow the catalog's existing order.
      </p>
      <p className="quiet-note">
        Seasons and scent families are editorial suggestions. Performance and
        ratings come from published community reviews.
      </p>
    </>
  );
}
