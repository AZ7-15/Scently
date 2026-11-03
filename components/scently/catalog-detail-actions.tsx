"use client";
import Link from "./site-link";
import { GitCompareArrows } from "lucide-react";
import type { Fragrance } from "@/lib/domain";
import { useScently } from "./shell";
export function CatalogDetailActions({
  fragrance: f,
}: {
  fragrance: Fragrance;
}) {
  const { compare, toggleCompare } = useScently();
  return (
    <div className="detail-actions">
      <Link
        className="button primary"
        href={"/fragrances?" + new URLSearchParams({ brand: f.brand })}
      >
        Explore this house
      </Link>
      <button
        className="button secondary"
        aria-pressed={compare.includes(f.id)}
        onClick={() => toggleCompare(f.id, f)}
      >
        <GitCompareArrows size={16} />
        {compare.includes(f.id) ? "Remove comparison" : "Compare"}
      </button>
      <a className="button secondary" href="#prices">
        View retailer information
      </a>
    </div>
  );
}
