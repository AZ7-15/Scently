"use client";
import { useState } from "react";
import Link from "@/components/scently/site-link";
import type { Fragrance, CollectionStatus } from "@/lib/domain";
import { ProductCard } from "./product";
import { useScently } from "./shell";
const lists: [CollectionStatus, string][] = [
  ["wishlist", "Wishlist"],
  ["owned", "My collection"],
  ["tried", "Tried"],
  ["test", "Want to test"],
];
export function Collection({ catalog }: { catalog: Fragrance[] }) {
  const { shelf, save } = useScently(),
    [tab, setTab] = useState<CollectionStatus>("wishlist");
  const items = catalog.filter((f) => shelf[f.id] === tab);
  return (
    <>
      <nav className="shelf-tabs" aria-label="Your fragrance lists">
        {lists.map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {name} ({Object.values(shelf).filter((s) => s === id).length})
          </button>
        ))}
      </nav>
      {items.length ? (
        <div className="product-grid">
          {items.map((f) => (
            <div key={f.id} className="shelf-item">
              <ProductCard fragrance={f} />
              <select
                aria-label={"Move " + f.name + " to list"}
                value={shelf[f.id]}
                onChange={(e) => save(f.id, e.target.value as CollectionStatus)}
              >
                {lists.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>A little space for your next discovery.</h2>
          <p>
            Save a fragrance, then move it between your lists as you explore.
          </p>
          <Link href="/fragrances" className="button primary">
            Find your next scent
          </Link>
        </div>
      )}
    </>
  );
}
