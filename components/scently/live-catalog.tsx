"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Flower2, Search } from "lucide-react";
import {
  brandSuggestions,
  liveProfilePath,
  type LiveSearch,
} from "@/lib/live-catalog";
export function LiveCatalog({
  initialQuery,
  initialResult,
  initialError,
}: {
  initialQuery: string;
  initialResult: LiveSearch | null;
  initialError: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [result, setResult] = useState(initialResult),
    [error, setError] = useState(initialError),
    [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  async function search(value: string, continuation?: string) {
    const q = value.trim();
    if (q.length < 2 || q.length > 150) {
      setError("Enter a fragrance or brand using 2–150 characters.");
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    setQuery(q);
    try {
      const params = new URLSearchParams({ q });
      if (continuation) params.set("continuation", continuation);
      const response = await fetch("/api/discovery/search?" + params);
      const data = (await response.json()) as LiveSearch & { error?: string };
      if (id !== requestId.current) return;
      if (!response.ok)
        throw new Error(
          data.error || "Fragrance search is temporarily unavailable.",
        );
      const next = data as LiveSearch;
      setResult((previous) => {
        if (!continuation || !previous || previous.query !== q) return next;
        const seen = new Set(
          previous.matches.map((item) => item.brand + "|" + item.name),
        );
        return {
          ...next,
          matches: [
            ...previous.matches,
            ...next.matches.filter(
              (item) => !seen.has(item.brand + "|" + item.name),
            ),
          ],
        };
      });
      // Keep reloads and shared search links consistent with the visible query.
      window.history.replaceState(
        null,
        "",
        "/fragrances?" + new URLSearchParams({ view: "live", q }),
      );
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }
  return (
    <section className="live-catalog" aria-label="Live fragrance database">
      <form
        className="search-box live-search-box"
        action="/fragrances"
        onSubmit={submit}
      >
        <Search size={20} />
        <input type="hidden" name="view" value="live" />
        <input
          name="q"
          aria-label="Search fragrance database"
          placeholder="Try Lattafa Khamrah, Dior, Armaf, Xerjoff…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          minLength={2}
          maxLength={150}
          required
        />
        <button disabled={busy} aria-label="Search database">
          {busy ? "Searching…" : <ArrowRight size={20} />}
        </button>
      </form>
      <p className="quiet-note">
        Live lookups from{" "}
        <a
          href="https://www.scento.com/developers/perfume-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          Scento Perfume API
        </a>
        . Coverage varies by brand; this source does not contain every
        fragrance.
      </p>
      <details className="brand-browser" open={!result}>
        <summary>Explore brands</summary>
        <div className="brand-suggestions">
          {Object.entries(brandSuggestions).map(([group, brands]) => (
            <section key={group}>
              <h2>{group}</h2>
              <div className="brand-chips">
                {brands.map((brand) => (
                  <button
                    className="plain-button"
                    key={brand}
                    disabled={busy}
                    onClick={() => void search(brand)}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
      {error && (
        <div className="info-line" role="alert">
          <p>{error}</p>
          <button
            className="plain-button"
            disabled={busy}
            onClick={() => void search(query)}
          >
            Try search again
          </button>
        </div>
      )}
      {busy && <p role="status">Searching the fragrance database…</p>}
      {result && (
        <div aria-live="polite" className="live-results">
          <p className="results-summary">
            {result.total.toLocaleString()} results reported by {result.source}{" "}
            for “{result.query}” · showing {result.matches.length}
          </p>
          {!result.matches.length ? (
            <div className="empty-state">
              <h2>No matching records from this source.</h2>
              <p>
                Try the brand name, a shorter fragrance name, or another
                spelling.
              </p>
            </div>
          ) : (
            <div className="live-results-grid">
              {result.matches.map((item) => (
                <article
                  className="live-result-card"
                  key={item.brand + "|" + item.name}
                >
                  <Flower2
                    className="live-result-icon"
                    size={30}
                    strokeWidth={1}
                    aria-hidden="true"
                  />
                  <div className="eyebrow">{item.brand}</div>
                  <h2>
                    <a href={liveProfilePath(item)}>{item.name}</a>
                  </h2>
                  <p>{item.family}</p>
                  <a className="text-link" href={liveProfilePath(item)}>
                    Explore notes <ArrowRight size={15} />
                  </a>
                </article>
              ))}
            </div>
          )}
          {result.continuation && (
            <button
              className="button secondary live-load-more"
              disabled={busy}
              onClick={() => void search(result.query, result.continuation!)}
            >
              Load more fragrances
            </button>
          )}
        </div>
      )}
    </section>
  );
}
