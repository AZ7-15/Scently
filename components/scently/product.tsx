"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  GitCompareArrows,
  Star,
} from "lucide-react";
import type { Fragrance } from "@/lib/domain";
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
      {f.imageUrl ? (
        // Licensed admin URLs do not require an image optimizer allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.imageUrl} alt={f.brand + " " + f.name} loading="lazy" />
      ) : (
        <div
          className={"bottle " + f.shape}
          role="img"
          aria-label={
            "Illustrated placeholder for " + f.name + "; not actual packaging"
          }
        >
          <div className="bottle-cap" />
          <div className="bottle-neck" />
          <div className="bottle-glass">
            <div className="bottle-label">
              <span>{f.brand}</span>
              <strong>{f.name}</strong>
              <small>{f.concentration}</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function ProductCard({ fragrance: f }: { fragrance: Fragrance }) {
  const { shelf, save, compare, toggleCompare, region } = useScently(),
    offer = sortedOffers(f.offers, region)[0];
  return (
    <article className="product-card">
      <div className={"product-visual tone-" + f.family}>
        <Link href={"/fragrances/" + f.slug} aria-label={"Explore " + f.name}>
          <Bottle fragrance={f} />
        </Link>
        <button
          className={"save-button " + (shelf[f.id] ? "saved" : "")}
          aria-label={(shelf[f.id] ? "Unsave " : "Save ") + f.name}
          aria-pressed={!!shelf[f.id]}
          onClick={() => save(f.id, shelf[f.id] ? null : "wishlist")}
        >
          <Bookmark size={18} fill={shelf[f.id] ? "currentColor" : "none"} />
        </button>
        <span className="image-caption">
          {f.imageUrl ? "" : "Illustration"}
        </span>
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
          <Link href={"/fragrances/" + f.slug}>{f.name}</Link>
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
          <button
            onClick={() => toggleCompare(f.id)}
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
            href={"/fragrances/" + f.slug + "#prices"}
          >
            Explore scent & retailer information <ArrowUpRight size={13} />
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
