"use client";
import { useState } from "react";
import Link from "next/link";
import { ThumbsUp, Flag, Star } from "lucide-react";
import {
  projections,
  seasons,
  type Review,
  type Fragrance,
} from "@/lib/domain";
import { api, useScently } from "./shell";
export function ReviewSection({
  initialReviews,
  fragranceId,
  catalog = [],
}: {
  initialReviews: Review[];
  fragranceId?: string;
  catalog?: Fragrance[];
}) {
  const { user, notify } = useScently(),
    [reviews, setReviews] = useState(initialReviews),
    [sort, setSort] = useState("helpful"),
    [limit, setLimit] = useState(5),
    [editing, setEditing] = useState<Review | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [report, setReport] = useState<string | null>(null),
    [reason, setReason] = useState("");
  const published = reviews.filter((r) => r.status === "published"),
    average = published.length
      ? published.reduce((s, r) => s + r.rating, 0) / published.length
      : null;
  function update(next: Review[], id?: string) {
    setReviews((prev) =>
      fragranceId
        ? next
        : [...prev.filter((r) => r.fragranceId !== id), ...next],
    );
  }
  async function action(r: Review, type: "helpful" | "report" | "delete") {
    if (!user) {
      notify("Sign in to contribute to the community.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ reviews: Review[] }>(
        "/api/reviews",
        {
          id: r.id,
          action: type,
          reason: type === "report" ? reason : undefined,
        },
        type === "delete" ? "DELETE" : "PATCH",
      );
      update(result.reviews, r.fragranceId);
      if (type === "report") {
        setReport(null);
        setReason("");
        notify("Your report is in the moderation queue.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget,
      d = new FormData(form);
    try {
      const id = fragranceId || String(d.get("fragranceId"));
      const result = await api<{ reviews: Review[] }>("/api/reviews", {
        fragranceId: id,
        rating: Number(d.get("rating")),
        content: d.get("content"),
        longevity: d.get("longevity") ? Number(d.get("longevity")) : null,
        projection: d.get("projection") || null,
        season: d.get("season") || null,
        occasion: d.get("occasion") || null,
      });
      update(result.reviews, id);
      setEditing(null);
      form.reset();
      notify("Your experience has been saved. Thank you.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const sorted = [...reviews].sort((a, b) =>
    sort === "recent"
      ? b.createdAt.localeCompare(a.createdAt)
      : sort === "highest"
        ? b.rating - a.rating
        : sort === "lowest"
          ? a.rating - b.rating
          : b.helpful - a.helpful,
  );
  return (
    <>
      <div className="results-header">
        <span>
          {average
            ? `${average.toFixed(1)} / 5 · ${published.length} reviews`
            : "No community ratings yet"}
        </span>
        <select
          aria-label="Sort reviews"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="helpful">Most helpful</option>
          <option value="recent">Most recent</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </div>
      {published.length > 0 && (
        <div>
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="rating-distribution">
              <span>{n} stars</span>
              <progress
                aria-label={`${n} star reviews`}
                value={published.filter((r) => r.rating === n).length}
                max={published.length}
              />
              <span>{published.filter((r) => r.rating === n).length}</span>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="review-layout">
        <div>
          {sorted.slice(0, limit).map((r) => (
            <article className="review-card" key={r.id}>
              <header>
                <div>
                  <h3>{r.username}</h3>
                  <span className="rating">
                    <Star size={13} />
                    {r.rating} / 5{" "}
                    {r.status !== "published" && " · " + r.status}
                  </span>
                </div>
                <time dateTime={r.createdAt}>
                  {new Date(r.createdAt).toLocaleDateString("en-CA", {
                    timeZone: "UTC",
                  })}
                </time>
              </header>
              {!fragranceId && (
                <Link
                  className="text-link"
                  href={
                    "/fragrances/" +
                    catalog.find((f) => f.id === r.fragranceId)?.slug
                  }
                >
                  {catalog.find((f) => f.id === r.fragranceId)?.name}
                </Link>
              )}
              <p>{r.content}</p>
              <div className="detail-meta">
                {r.longevity !== null && <span>{r.longevity} hours</span>}
                {r.projection && <span>{r.projection} projection</span>}
                {r.season && <span>{r.season}</span>}
                {r.occasion && <span>{r.occasion}</span>}
              </div>
              <div className="review-actions">
                {r.userId !== user?.id ? (
                  <>
                    <button
                      disabled={busy || r.voted}
                      onClick={() => action(r, "helpful")}
                    >
                      <ThumbsUp size={13} />
                      {r.voted ? "Marked helpful" : "Helpful"} ({r.helpful})
                    </button>
                    <button
                      onClick={() => {
                        if (!user) notify("Sign in to report a review.");
                        else setReport(report === r.id ? null : r.id);
                      }}
                    >
                      <Flag size={13} />
                      Report
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(r)}>Edit review</button>
                    <button disabled={busy} onClick={() => action(r, "delete")}>
                      Delete review
                    </button>
                  </>
                )}
              </div>
              {report === r.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(r, "report");
                  }}
                  className="review-form"
                >
                  <label className="field">
                    <span>Reason for reporting</span>
                    <input
                      required
                      minLength={5}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button className="button secondary" disabled={busy}>
                    Submit report
                  </button>
                </form>
              )}
            </article>
          ))}
          {!reviews.length && (
            <div className="empty-state">
              <h2>Make the first impression.</h2>
              <p>
                There are no reviews yet. Share your own experience to help the
                next curious nose.
              </p>
            </div>
          )}
          {sorted.length > limit && (
            <button
              className="button secondary"
              onClick={() => setLimit(limit + 10)}
            >
              See more reviews
            </button>
          )}
        </div>
        <div className="panel">
          {user ? (
            <form
              key={editing?.id || "new"}
              className="review-form"
              onSubmit={submit}
            >
              <h3>
                {editing ? "Edit your experience" : "Your experience matters."}
              </h3>
              {!fragranceId && (
                <label className="field">
                  <span>Fragrance</span>
                  <select
                    name="fragranceId"
                    required
                    defaultValue={editing?.fragranceId}
                  >
                    {catalog.map((f) => (
                      <option value={f.id} key={f.id}>
                        {f.brand} · {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Overall rating</span>
                <select name="rating" defaultValue={editing?.rating || 5}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Your review</span>
                <textarea
                  required
                  name="content"
                  minLength={15}
                  maxLength={3000}
                  defaultValue={editing?.content}
                  placeholder="What stood out? How did it feel to wear?"
                />
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Longevity (hours, optional)</span>
                  <input
                    name="longevity"
                    type="number"
                    min="0.5"
                    max="48"
                    step="0.5"
                    defaultValue={editing?.longevity ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Projection (optional)</span>
                  <select
                    name="projection"
                    defaultValue={editing?.projection || ""}
                  >
                    <option value="">Not sure</option>
                    {projections.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="field">
                  <span>Season (optional)</span>
                  <select name="season" defaultValue={editing?.season || ""}>
                    <option value="">Any season</option>
                    {seasons.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Occasion (optional)</span>
                  <input
                    name="occasion"
                    maxLength={80}
                    defaultValue={editing?.occasion || ""}
                  />
                </label>
              </div>
              <p className="info-line">
                One review per person and fragrance. Submitting again updates
                your previous review. Share first-hand experiences; no
                promotional links or personal information.
              </p>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save review"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="plain-button"
                  onClick={() => setEditing(null)}
                >
                  Cancel edit
                </button>
              )}
            </form>
          ) : (
            <>
              <h2>Your experience matters.</h2>
              <p>
                Sign in to write a review, save scents, and help others
                discover.
              </p>
              <a
                className="button primary"
                href={
                  "/signin-with-chatgpt?return_to=" +
                  encodeURIComponent("/reviews")
                }
                target="_top"
              >
                Sign in with ChatGPT
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
