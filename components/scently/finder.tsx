"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Sparkles, ArrowUpRight, ArrowUp } from "lucide-react";
import type { Criteria } from "@/lib/domain";
import type { Match } from "@/lib/discovery";
import { ProductCard } from "./product";
import { useScently, api } from "./shell";
import Link from "./site-link";
type Result = {
  criteria: Criteria;
  matches: Match[];
  mode: string;
  notice: string;
  message: string;
  continuation: string | null;
  coverage: {
    scope: string;
    assessed: number;
    totalCandidates: number;
    sourceCandidates: number;
    indexedCandidates?: number;
  } | null;
  catalogHref: string;
};
const examples = [
  "Find me something warm and memorable for an evening out.",
  "Find me a sweet winter fragrance.",
  "I want a masculine vanilla fragrance.",
  "Find a fragrance like Dior Sauvage but cheaper.",
  "Recommend a fresh fragrance under $100.",
  "I need something long-lasting for school.",
  "Find me a fragrance with strong projection.",
];
export function Finder({ configured }: { configured: boolean }) {
  const params = useSearchParams(),
    { region } = useScently();
  const [draft, setDraft] = useState(params.get("prompt") || ""),
    [turns, setTurns] = useState<{ prompt: string; result: Result }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send(message = draft) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Result>("/api/finder", {
        message,
        region,
        previous: turns.at(-1)?.result.criteria,
      });
      setTurns((t) => [...t, { prompt: message, result }]);
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function more(index: number) {
    const turn = turns[index];
    if (busy || !turn.result.continuation) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<Result>("/api/finder", {
        message: turn.prompt,
        previous: turn.result.criteria,
        region,
        continuation: turn.result.continuation,
        seen: turn.result.matches.map((m) => m.fragrance.id).slice(-2000),
      });
      setTurns((current) =>
        current.map((item, i) =>
          i === index
            ? {
                ...item,
                result: {
                  ...next,
                  matches: [
                    ...item.result.matches,
                    ...next.matches.filter(
                      (match) =>
                        !item.result.matches.some(
                          (old) => old.fragrance.id === match.fragrance.id,
                        ),
                    ),
                  ],
                },
              }
            : item,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="finder-page">
      <header className="finder-header">
        <Sparkles size={32} strokeWidth={1.2} />
        <div className="eyebrow centered">
          A LITTLE GUIDANCE. SOMETHING YOU.
        </div>
        <h1>
          Let’s find <em>your fragrance.</em>
        </h1>
        <p>
          Tell me what kind of fragrance you’re looking for. Describe the notes,
          mood, budget, season, or performance you want.
        </p>
        <span className="mode-badge">
          {configured
            ? "Gemini AI with Fragrantica and brand research"
            : "Fragrantica and brand research; Gemini key not connected"}
        </span>
        <p className="quiet-note">
          Your preferences search the same source catalog as{" "}
          <Link href="/fragrances">fragrance browsing</Link>. Results are ranked
          from retrieved candidates, with more pages available.
        </p>
      </header>
      {!turns.length && (
        <div className="example-prompts">
          {examples.map((p) => (
            <button key={p} disabled={busy} onClick={() => send(p)}>
              {p}
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      )}
      <div aria-live="polite">
        {turns.map((t, i) => (
          <section className="chat-turn" key={i}>
            <div className="user-message">{t.prompt}</div>
            <p className="assistant-message">
              <Sparkles size={20} />
              {t.result.message}
            </p>
            <p className="info-line">{t.result.notice}</p>
            {t.result.coverage && (
              <p className="quiet-note">
                {t.result.coverage.totalCandidates.toLocaleString()} live-source
                candidates.{" "}
                {t.result.coverage.indexedCandidates
                  ? "Also searched " +
                    t.result.coverage.indexedCandidates.toLocaleString() +
                    " published-index candidates. "
                  : ""}
                This request assessed {t.result.coverage.assessed} records;
                missing prices or performance are not guessed.
              </p>
            )}
            {[true, false].map((exact) => {
              const matches = t.result.matches.filter((m) => m.exact === exact);
              return matches.length ? (
                <div key={String(exact)}>
                  <h2 className="match-heading">
                    {exact
                      ? "Matches your preferences"
                      : "Near matches — preferences not fully verified"}
                  </h2>
                  <div className="match-grid">
                    {matches.map((m) => (
                      <article className="match-card" key={m.fragrance.id}>
                        <ProductCard fragrance={m.fragrance} />
                        <div className="match-evidence">
                          <strong>Why it’s here</strong>
                          <ul>
                            {m.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                          {m.sources?.length ? (
                            <p className="source-links">
                              Sources: {m.sources.map((source, sourceIndex) => (
                                <span key={source.url}>
                                  {sourceIndex > 0 ? " · " : ""}
                                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    {source.title}
                                  </a>
                                </span>
                              ))}
                            </p>
                          ) : null}
                          {m.gaps.length > 0 && (
                            <>
                              <strong>Keep in mind</strong>
                              <ul className="gaps">
                                {m.gaps.map((g) => (
                                  <li key={g}>{g}</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null;
            })}
            <div className="finder-catalog-actions">
              {t.result.continuation && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void more(i)}
                >
                  More recommendations
                </button>
              )}
              {t.result.catalogHref && (
                <Link className="text-link" href={t.result.catalogHref}>
                  Browse these preferences in the catalog{" "}
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          </section>
        ))}
        {busy && (
          <p role="status" className="assistant-message">
            <Sparkles size={18} />
            Looking through the catalog…
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="finder-message">
          Describe your ideal fragrance
        </label>
        <textarea
          id="finder-message"
          value={draft}
          maxLength={1500}
          minLength={2}
          required
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            turns.length
              ? "Refine your search: “Only winter fragrances”"
              : "Something with vanilla, for cold evenings…"
          }
        />
        <footer>
          <span>
            Shopping in{" "}
            {region === "CA" ? "CAD · Canada" : "USD · United States"}. Session
            preferences stay on this page.
          </span>
          <button
            className="button primary"
            aria-label="Find fragrances"
            disabled={busy || draft.trim().length < 2}
          >
            <ArrowUp size={17} />
            {busy ? "Finding…" : "Find my scent"}
          </button>
        </footer>
      </form>
      {turns.length > 0 && (
        <button
          className="plain-button"
          onClick={() => {
            setTurns([]);
            setDraft("");
            setError("");
          }}
        >
          Start a new discovery
        </button>
      )}
      <p className="quiet-note">
        Date-night and mood suggestions use Gemini with grounded Google Search,
        prioritizing Fragrantica fragrance pages and official brand product pages.
        Only matching fragrances already in Scently's catalog are shown; source
        links appear with supported matches.
        Fragrance is personal; check current retailer totals before purchasing.
      </p>
    </div>
  );
}
