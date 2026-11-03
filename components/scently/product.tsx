"use client";
import Link from "@/components/scently/site-link";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  GitCompareArrows,
  Star,
} from "lucide-react";
import { fragrancePath, type Fragrance } from "@/lib/domain";
import { ProductPhoto } from "./product-photo";
import { sortedOffers, offerTotal } from "@/lib/discovery";
import { useScently } from "./shell";
export function Bottle({
  fragrance: f,
  large = false,
}: {
  fragrance: Fragrance;
  large?: boolean;
}) {
  return (
    <div
      className={"bottle-stage " + (large ? "large" : "")}
      style={{ "--bottle-color": f.color } as React.CSSProperties}
    >
      <ProductPhoto
        key={f.id}
        name={f.name}
        brand={f.brand}
        concentration={f.concentration}
        sourceUrl={f.sourceUrl}
        imageUrl={f.imageUrl}
        large={large}
      />
    </div>
  );
}
export function ProductCard({ fragrance: f }: { fragrance: Fragrance }) {
  const { shelf, save, compare, toggleCompare, region } = useScently(),
    offer = sortedOffers(f.offers, region)[0];
  return (
    <article className="product-card">
      <div className={"product-visual tone-" + f.family}>
        {f.isNewArrival && <span className="arrival-badge">New arrival</span>}
        <Link href={fragrancePath(f)} aria-label={"Explore " + f.name}>
          <Bottle fragrance={f} />
        </Link>
        {!f.externalLookup && (
          <button
            className={"save-button " + (shelf[f.id] ? "saved" : "")}
            aria-label={(shelf[f.id] ? "Unsave " : "Save ") + f.name}
            aria-pressed={!!shelf[f.id]}
            onClick={() => save(f.id, shelf[f.id] ? null : "wishlist")}
          >
            <Bookmark size={18} fill={shelf[f.id] ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="product-copy">
        <div className="brand-line">
          {f.brand}
          <span className="rating">
            <Star size={12} />
            {f.rating
              ? f.rating.toFixed(1) + " (" + f.reviewCount + ")"
              : "Unrated"}
          </span>
        </div>
        <h3>
          <Link
            href={fragrancePath(f)}
            aria-label={
              f.externalLookup ? f.name + " — " + f.concentration : undefined
            }
          >
            {f.name}
          </Link>
        </h3>
        <p className="concentration">{f.concentration}</p>
        <div className="accord-tags">
          {f.accords.slice(0, 3).map((a) => (
            <Link key={a} href={"/fragrances?note=" + encodeURIComponent(a)}>
              {a}
            </Link>
          ))}
        </div>
        <div className="card-bottom">
          <span>{f.editorialSeasons.slice(0, 2).join(" · ")}</span>
          {
            <button
              onClick={() => toggleCompare(f.id, f)}
              aria-label={
                (compare.includes(f.id) ? "Remove " : "Compare ") + f.name
              }
              aria-pressed={compare.includes(f.id)}
            >
              {compare.includes(f.id) ? (
                <Check size={14} />
              ) : (
                <GitCompareArrows size={14} />
              )}{" "}
              Compare
            </button>
          }
        </div>
        {offer ? (
          <p className="price-line">
            From {offer.currency} ${offerTotal(offer).toFixed(2)}
            {offer.tax === null ? " + tax" : ""}
            {offer.shipping === null ? " + shipping" : ""}
          </p>
        ) : (
          <Link
            className="price-line"
            href={fragrancePath(f) + (f.externalLookup ? "" : "#prices")}
          >
            {f.externalLookup
              ? "Explore fragrance details"
              : "Explore scent & retailer information"}{" "}
            <ArrowUpRight size={13} />
          </Link>
        )}
      </div>
    </article>
  );
}
export function ProductGrid({ fragrances }: { fragrances: Fragrance[] }) {
  return (
    <div className="product-grid">
      {fragrances.map((f) => (
        <ProductCard key={f.id} fragrance={f} />
      ))}
    </div>
  );
}
