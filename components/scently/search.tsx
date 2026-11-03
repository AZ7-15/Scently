"use client";
import Link from "@/components/scently/site-link";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { fragrancePath, type Fragrance } from "@/lib/domain";
export function SearchBox({
  large = false,
}: {
  catalog: Fragrance[];
  large?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<{
    query: string;
    items: Fragrance[];
    error: string;
  }>({ query: "", items: [], error: "" });
  const trimmed = query.trim();
  useEffect(() => {
    if (!focused || trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/catalog?" + new URLSearchParams({ q: trimmed }), {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            results?: Fragrance[];
            error?: string;
          };
          if (!response.ok)
            throw new Error(
              data.error || "Catalog search is unavailable. Please retry.",
            );
          if (!controller.signal.aborted)
            setResult({ query: trimmed, items: data.results || [], error: "" });
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setResult({
              query: trimmed,
              items: [],
              error: (e as Error).message,
            });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, focused]);
  const matches = result.query === trimmed ? result.items.slice(0, 4) : [];
  return (
    <div
      className={"search-wrap " + (large ? "hero-search" : "")}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <form className="search-box" action="/fragrances">
        <Search size={20} />
        <input
          aria-label="Search fragrances, brands, or notes"
          name="q"
          value={query}
          maxLength={150}
          onFocus={() => setFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          placeholder="Search fragrances, brands, or notes..."
        />
        <button aria-label="Search">
          <ArrowRight size={19} />
        </button>
      </form>
      {focused && trimmed.length > 1 && (
        <ul className="suggestions" aria-label="Search suggestions">
          {result.query !== trimmed && (
            <li>
              <span role="status">Searching the catalog...</span>
            </li>
          )}
          {result.query === trimmed && result.error && (
            <li>
              <span role="alert">{result.error}</span>
            </li>
          )}
          {matches.map((f) => (
            <li key={f.id}>
              <Link href={fragrancePath(f)}>
                <span>{f.name}</span>
                <small>
                  {f.brand}
                  {f.concentration !== "Not provided"
                    ? " - " + f.concentration
                    : ""}
                </small>
                <ArrowRight size={14} />
              </Link>
            </li>
          ))}
          <li>
            <Link href={"/fragrances?" + new URLSearchParams({ q: trimmed })}>
              <span>View all catalog results</span>
              <ArrowRight size={14} />
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
