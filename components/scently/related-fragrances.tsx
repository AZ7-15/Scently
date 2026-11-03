import { browseSourceCatalog } from "@/lib/server/source-browse";
import { getOpenCatalog } from "@/lib/server/open-catalog";
import { curatedCatalog } from "@/data/catalog";
import {
  mergeFragrances,
  matchingCatalogEdition,
  identityName,
  brandKey,
} from "@/lib/catalog";
import type { Note } from "@/lib/domain";
import { ProductGrid } from "./product";
export async function RelatedFragrances({
  fragrance: f,
}: {
  fragrance: {
    name: string;
    brand: string;
    concentration: string | null;
    notes: Note[];
  };
}) {
  const notes = new Set(f.notes.map((n) => identityName(n.name)));
  const [open, storefront] = await Promise.all([
    getOpenCatalog(),
    browseSourceCatalog({ brand: f.brand }, undefined, {
      candidates: true,
    }).catch(() => ({ results: [] })),
  ]);
  const candidates = mergeFragrances(curatedCatalog, [
    ...storefront.results,
    ...open,
  ])
    .filter(
      (v) =>
        !matchingCatalogEdition(
          { ...f, concentration: f.concentration || "" },
          v,
        ),
    )
    .map((v) => ({
      fragrance: v,
      score:
        v.notes.filter((n) => notes.has(identityName(n.name))).length +
        (brandKey(v.brand) === brandKey(f.brand) ? 2 : 0),
    }))
    .filter((v) => v.score > 0)
    .sort(
      (a, b) =>
        Number(!!b.fragrance.imageUrl) - Number(!!a.fragrance.imageUrl) ||
        b.score - a.score,
    )
    .slice(0, 4)
    .map((v) => v.fragrance);
  if (!candidates.length) return null;
  return (
    <section className="detail-section">
      <h2>Keep exploring</h2>
      <p className="info-line">
        Follow a shared note or discover another expression from this house.
      </p>
      <ProductGrid fragrances={candidates} />
    </section>
  );
}
