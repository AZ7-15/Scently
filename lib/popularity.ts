import type { Fragrance } from "@/lib/domain";

export function comparePopularity(a: Fragrance, b: Fragrance) {
  const score = (item: Fragrance) => {
    const ranks = [
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
