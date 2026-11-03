import ranking from "@/data/10ml-bestsellers.json";
import { brandKey, catalogNameKey, concentrationKey } from "@/lib/catalog";
import type { Fragrance } from "@/lib/domain";

type Bestseller = {
  rank: number;
  brand: string;
  name: string;
  concentration: string | null;
};
const bestsellers = (ranking as { products: Bestseller[] }).products;

type Edition = Pick<Fragrance, "name"> & { concentration?: string | null };

function editionConcentration(item: Edition) {
  return (
    concentrationKey(item.concentration) ||
    concentrationKey(
      item.name.match(
        /(?:eau de parfum|eau de toilette|eau de cologne|extrait de parfum|extrait|edp|edt|edc|elixir)$/i,
      )?.[0],
    )
  );
}

/** Match sales ranks only to the same house and edition. */
export function bestsellerRankFor(
  item: Pick<Fragrance, "name" | "brand" | "concentration">,
  catalog: Pick<Fragrance, "name" | "brand" | "concentration">[],
) {
  const name = catalogNameKey(item.name, item.brand);
  const candidates = bestsellers.filter(
    (candidate) =>
      brandKey(candidate.brand) === brandKey(item.brand) &&
      catalogNameKey(candidate.name, candidate.brand) === name,
  );
  if (!candidates.length) return null;

  const itemStrength = editionConcentration(item);
  const catalogVariants = catalog
    .filter(
      (candidate) =>
        brandKey(candidate.brand) === brandKey(item.brand) &&
        catalogNameKey(candidate.name, candidate.brand) === name,
    )
    .map(editionConcentration)
    .filter(Boolean);
  const distinctVariants = new Set(catalogVariants);
  const ranks = candidates.flatMap((candidate) => {
    const sourceStrength = editionConcentration(candidate);
    if (sourceStrength && itemStrength !== sourceStrength) return [];
    if (!sourceStrength && distinctVariants.size > 1) return [];
    return [candidate.rank];
  });
  return ranks.length ? Math.min(...ranks) : null;
}

export function comparePopularity(a: Fragrance, b: Fragrance) {
  const score = (item: Fragrance) => {
    const ranks = [
      item.bestsellerRank == null ? null : item.bestsellerRank / 200,
      item.popularityRank == null ? null : item.popularityRank / 1200,
    ].filter((rank): rank is number => rank !== null);
    return ranks.length
      ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length
      : Number.POSITIVE_INFINITY;
  };
  const aScore = score(a);
  const bScore = score(b);
  if (aScore !== bScore) return aScore - bScore;

  return b.reviewCount - a.reviewCount;
}
