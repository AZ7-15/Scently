"use client";
import { Bookmark, GitCompareArrows, ArrowUpRight } from "lucide-react";
import type { Fragrance } from "@/lib/domain";
import { isCurrentOffer, offerTotal, sortedOffers } from "@/lib/discovery";
import { useScently } from "./shell";
export function DetailActions({ fragrance: f }: { fragrance: Fragrance }) {
  const { save, shelf, toggleCompare, compare } = useScently();
  return (
    <div className="detail-actions">
      <button
        className="button primary"
        onClick={() => save(f.id, shelf[f.id] ? null : "wishlist")}
      >
        <Bookmark size={16} />
        {shelf[f.id] ? "Saved to your shelf" : "Save to my shelf"}
      </button>
      <button
        className="button secondary"
        aria-pressed={compare.includes(f.id)}
        onClick={() => toggleCompare(f.id)}
      >
        <GitCompareArrows size={16} />
        {compare.includes(f.id) ? "Remove comparison" : "Compare"}
      </button>
      <a className="button secondary" href="#prices">
        View prices
      </a>
    </div>
  );
}
export function Prices({ fragrance: f }: { fragrance: Fragrance }) {
  const { region } = useScently();
  const current = sortedOffers(f.offers, region),
    expired = f.offers.filter(
      (o) => o.region === region && !isCurrentOffer(o, region),
    );
  const groups = [
    ...new Set(
      current.map(
        (o) => `${o.size}|${o.concentration}|${o.packaging}|${o.condition}`,
      ),
    ),
  ];
  return (
    <section id="prices" className="detail-section">
      <h2>A thoughtful purchase starts here.</h2>
      <p className="info-line">
        Prices in {region === "CA" ? "Canadian dollars" : "US dollars"}.
        Verification expires after 48 hours. Compare equivalent sizes,
        concentrations, and packaging.
      </p>
      {current.length ? (
        <div className="table-scroll">
          <table className="offer-table">
            <thead>
              <tr>
                {[
                  "Retailer",
                  "Variant",
                  "Price",
                  "Shipping / tax",
                  "Estimated cost",
                  "Checked",
                  "Shop",
                ].map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((group) =>
                current
                  .filter(
                    (o) =>
                      `${o.size}|${o.concentration}|${o.packaging}|${o.condition}` ===
                      group,
                  )
                  .map((o, i) => (
                    <tr key={o.id}>
                      <td>
                        {o.retailer}
                        {i === 0 && o.shipping !== null && o.tax !== null && (
                          <small>Lowest verified total for this variant</small>
                        )}
                      </td>
                      <td>
                        {o.size} mL · {o.concentration}
                        <small>
                          {o.packaging} · {o.condition}
                        </small>
                      </td>
                      <td>
                        {o.currency} ${o.price.toFixed(2)}
                        <small>${(o.price / o.size).toFixed(2)} / mL</small>
                      </td>
                      <td>
                        {o.shipping === null
                          ? "Shipping unknown"
                          : "Shipping $" + o.shipping.toFixed(2)}
                        <small>
                          {o.tax === null
                            ? "Tax unknown"
                            : "Tax $" + o.tax.toFixed(2)}
                        </small>
                      </td>
                      <td>
                        ${offerTotal(o).toFixed(2)}
                        <small>
                          {o.shipping === null || o.tax === null
                            ? "Subtotal; unknown charges excluded"
                            : "Total including shipping and tax"}
                        </small>
                      </td>
                      <td>
                        {new Date(o.verifiedAt).toLocaleString("en-CA")}
                        <small>{o.source}</small>
                      </td>
                      <td>
                        <a
                          href={o.affiliateUrl || o.url}
                          target="_blank"
                          rel={
                            "noopener noreferrer " +
                            (o.affiliateUrl ? "sponsored" : "")
                          }
                          className="text-link"
                        >
                          Visit store <ArrowUpRight size={14} />
                        </a>
                        {o.affiliateUrl && <small>Affiliate link</small>}
                      </td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h2>No verified offers right now.</h2>
          <p>
            We haven’t connected an authorized retailer feed for this fragrance.
            Visit a retailer to check availability and the final price.
          </p>
          <div className="retailer-links">
            <a
              href="https://fragrancebuy.ca/"
              target="_blank"
              rel="noopener noreferrer"
            >
              FragranceBuy <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.fragrancenet.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              FragranceNet <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.jomashop.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Jomashop <ArrowUpRight size={13} />
            </a>
            <a
              href="https://www.fragrancex.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              FragranceX <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      )}
      {expired.length > 0 && (
        <p className="info-line">
          {expired.length} expired or unavailable listings excluded from current
          prices.
        </p>
      )}
      <p className="info-line">
        Retailer directory links do not imply stock, authorization, or a
        commercial partnership. Affiliate links, when configured, are labeled.
      </p>
    </section>
  );
}
