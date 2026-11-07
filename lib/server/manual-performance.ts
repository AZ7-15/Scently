import { concentrationKey, sameFragrance } from "@/lib/catalog";
import type { WearEvidence } from "@/lib/wear-evidence";

/**
 * Exact-edition demonstration estimate. A comparison article reports 10–11h
 * and moderate projection; an individual wearer reports about 8h and strong
 * projection for the first 2–3h. The wider range reflects that variation.
 * Armani advertises up to 24-hour lastingness; that is a brand claim, not a
 * typical-wear measurement.
 * Sources: chaosfragrances.com/blogs/fragrance-guides/which-stronger-with-you-lasts-longest
 * reddit.com/r/Colognes/comments/1q8cz9z/i_got_my_hands_on_armani_stronger_with_you/
 * armanibeauty.co.uk/.../emporio-armani-stronger-with-you-powerfully/3614274747058.html
 */
export function getManualPerformance(
  name: string,
  brand: string,
  concentration: string,
): WearEvidence[] {
  if (
    !sameFragrance(
      { name, brand },
      { name: "Stronger With You Powerfully", brand: "Emporio Armani" },
    ) ||
    concentrationKey(concentration) !== "edp"
  ) return [];

  return [{
    source: "Manual exact-edition research",
    sourceUrl: "https://www.chaosfragrances.com/blogs/fragrance-guides/which-stronger-with-you-lasts-longest",
    checkedAt: "2026-11-06T00:00:00.000Z",
    kind: "manual-research",
    longevity: "About 8-11 hours",
    projection: "Moderate, stronger in the opening",
  }];
}
