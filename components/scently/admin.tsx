"use client";
import { useState } from "react";
import type { Fragrance, Review } from "@/lib/domain";
import { api } from "./shell";
type Props = {
  catalog: Fragrance[];
  reviews: Review[];
  reports: { id: string; reviewId: string; reason: string; status: string }[];
  retailers: { id: string; name: string; status: string }[];
  usage: { requests: number; input: number; output: number };
  auditCount: number;
};
export function Admin({
  catalog,
  reviews,
  reports,
  retailers,
  usage,
  auditCount,
}: Props) {
  const [record, setRecord] = useState(JSON.stringify(catalog[0], null, 2)),
    [overwrite, setOverwrite] = useState(false),
    [offer, setOffer] = useState(""),
    [content, setContent] = useState(""),
    [format, setFormat] = useState<"json" | "csv">("json"),
    [validation, setValidation] = useState<{
      count: number;
      errors: { row: number; message: string }[];
      committed: boolean;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function run(body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api("/api/admin", body);
      setMessage("Saved successfully.");
      if (
        (body as { action?: string; commit?: boolean }).action !== "import" ||
        (body as { commit?: boolean }).commit
      )
        window.location.reload();
      return r;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveJson(action: "fragrance" | "offer", text: string) {
    try {
      await run({ action, record: JSON.parse(text), overwrite });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="admin-stats">
        <div>
          <strong>{catalog.length}</strong>Fragrances
        </div>
        <div>
          <strong>{reviews.length}</strong>Reviews
        </div>
        <div>
          <strong>{reports.filter((r) => r.status === "open").length}</strong>
          Open reports
        </div>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <div className="admin-grid">
        <section className="panel">
          <h2>Fragrance editor</h2>
          <p>
            Manage brands, notes, accords, and source attribution together. Only
            reference images you have rights to display.
          </p>
          <label className="field">
            <span>Load a record</span>
            <select
              onChange={(e) => {
                const f = catalog.find((f) => f.id === e.target.value);
                if (f) setRecord(JSON.stringify(f, null, 2));
                setOverwrite(false);
              }}
            >
              {catalog.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} · {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fragrance JSON</span>
            <textarea
              value={record}
              onChange={(e) => setRecord(e.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />{" "}
            Replace the existing record with this reviewed data
          </label>
          <p className="info-line">
            To create a fragrance, use a new id and slug. Source URL, notes and
            checkedAt are required.
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => saveJson("fragrance", record)}
          >
            Save fragrance
          </button>
        </section>
        <section className="panel">
          <h2>Import sourced records</h2>
          <p>
            Validate first. Imports detect duplicates and never overwrite an
            existing fragrance. CSV array columns contain JSON.
          </p>
          <label className="field">
            <span>Format</span>
            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value as "json" | "csv");
                setValidation(null);
              }}
            >
              <option value="json">JSON array</option>
              <option value="csv">CSV with headers</option>
            </select>
          </label>
          <label className="field">
            <span>Upload data</span>
            <input
              type="file"
              accept=".json,.csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 110000) {
                    setError("Maximum import size is 110 KB.");
                    return;
                  }
                  setContent(await file.text());
                  setValidation(null);
                }
              }}
            />
          </label>
          <label className="field">
            <span>Import content</span>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setValidation(null);
              }}
            />
          </label>
          <div className="detail-actions">
            <button
              className="button secondary"
              disabled={busy || !content}
              onClick={async () => {
                const r = await run({
                  action: "import",
                  content,
                  format,
                  commit: false,
                });
                if (r) setValidation(r as typeof validation);
              }}
            >
              Validate import
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                !validation ||
                validation.errors.length > 0 ||
                validation.committed
              }
              onClick={async () => {
                const r = await run({
                  action: "import",
                  content,
                  format,
                  commit: true,
                });
                if (r) setValidation(r as typeof validation);
              }}
            >
              Import validated records
            </button>
          </div>
          {validation && (
            <div className="info-line">
              {validation.count} valid records ·{" "}
              {validation.committed ? "Imported" : "Preview only"}
              <ul>
                {validation.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Retailer offers</h2>
          <p>
            Add manually verified listings from authorized sources. Use null for
            unknown shipping or tax. Listings expire after 48 hours.
          </p>
          <button
            className="plain-button"
            onClick={() =>
              setOffer(
                JSON.stringify(
                  {
                    id: "replace-with-listing-id",
                    fragranceId: catalog[0]?.id,
                    retailer: "Replace with retailer",
                    size: 100,
                    concentration: catalog[0]?.concentration,
                    packaging: "retail",
                    condition: "new",
                    price: 0,
                    currency: "CAD",
                    region: "CA",
                    shipping: null,
                    tax: null,
                    inStock: false,
                    verifiedAt: new Date().toISOString(),
                    url: "https://example.com/replace-with-product",
                    affiliateUrl: null,
                    source: "Replace with source and verification method",
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Load blank offer template
          </button>
          <label className="field">
            <span>Verified offer JSON</span>
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={busy || !offer}
            onClick={() => saveJson("offer", offer)}
          >
            Save verified offer
          </button>
          {catalog
            .flatMap((f) => f.offers)
            .map((o) => (
              <div className="admin-row" key={o.id}>
                <span>
                  {o.retailer} · {o.fragranceId} · {o.currency} {o.price}
                </span>
                <button
                  className="plain-button"
                  onClick={() => setOffer(JSON.stringify(o, null, 2))}
                >
                  Edit
                </button>
                <button
                  className="plain-button"
                  disabled={busy}
                  onClick={() => run({ action: "delete-offer", id: o.id })}
                >
                  Remove
                </button>
              </div>
            ))}
          {retailers.map((r) => (
            <div className="admin-row" key={r.id}>
              <span>
                {r.name} · {r.status}
              </span>
              <button
                className="plain-button"
                disabled={busy}
                onClick={() =>
                  run({
                    action: "retailer",
                    id: r.id,
                    status: r.status === "active" ? "inactive" : "active",
                  })
                }
              >
                {r.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Moderation queue</h2>
          {!reviews.length && <p>No reviews to moderate yet.</p>}
          {reviews.map((r) => (
            <article className="review-card" key={r.id}>
              <h3>
                {r.username} · {r.status}
              </h3>
              <p>{r.content}</p>
              <label className="field">
                <span>Review visibility</span>
                <select
                  disabled={busy}
                  value={r.status}
                  onChange={(e) =>
                    run({
                      action: "moderate",
                      id: r.id,
                      status: e.target.value,
                    })
                  }
                >
                  {["published", "pending", "hidden"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {reports
                .filter((v) => v.reviewId === r.id && v.status === "open")
                .map((v) => (
                  <div key={v.id}>
                    <p>Report: {v.reason}</p>
                    <button
                      className="plain-button"
                      disabled={busy}
                      onClick={() =>
                        run({ action: "resolve-report", id: v.id })
                      }
                    >
                      Mark report resolved
                    </button>
                  </div>
                ))}
            </article>
          ))}
        </section>
      </div>
      <section className="panel detail-section">
        <h2>Data quality & operations</h2>
        <p>
          {catalog.filter((f) => !f.imageUrl).length} records have no stored
          product photo. {catalog.filter((f) => !f.reviewCount).length} records
          have no community evidence.{" "}
          {catalog.filter((f) => !f.offers.length).length} records have no
          retailer offers.
        </p>
        <p>
          {usage.requests} AI requests · {usage.input} input tokens ·{" "}
          {usage.output} output tokens. Dollar cost is not estimated without
          your provider billing rates. {auditCount} administrative audit
          entries.
        </p>
        <p>
          Retailer feeds are not configured. Accounts use email/password
          sign-in.
        </p>
      </section>
    </>
  );
}
