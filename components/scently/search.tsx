"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { Fragrance } from "@/lib/domain";
export function SearchBox({
  catalog,
  large = false,
}: {
  catalog: Fragrance[];
  large?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    [focused, setFocused] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);
  const matches =
    debounced.length > 1
      ? catalog
          .filter((f) =>
            (
              f.brand +
              " " +
              f.name +
              " " +
              f.notes.map((n) => n.name).join(" ")
            )
              .toLowerCase()
              .includes(debounced.toLowerCase()),
          )
          .slice(0, 4)
      : [];
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
          onFocus={() => setFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          placeholder="Search fragrances, brands, or notes..."
        />
        <button aria-label="Search">
          <ArrowRight size={19} />
        </button>
      </form>
      {focused && matches.length > 0 && (
        <ul className="suggestions" aria-label="Search suggestions">
          {matches.map((f) => (
            <li key={f.id}>
              <Link href={"/fragrances/" + f.slug}>
                <span>{f.name}</span>
                <small>{f.brand}</small>
                <ArrowRight size={14} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
