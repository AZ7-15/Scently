import { sameFragrance, concentrationKey } from "@/lib/catalog";
import type { WearEvidence } from "@/lib/wear-evidence";
import { detailedProfile } from "./fragrance-editorial";
import { getLiveFragrance, searchLiveFragrances } from "./scento";
import { memoryLimit } from "./memory-limits";

const cache = new Map<string, { evidence: WearEvidence[]; expires: number }>();
const pending = new Map<string, Promise<WearEvidence[]>>();

export async function getScentoWearPerformance(
  name: string,
  brand: string,
  concentration: string,
): Promise<WearEvidence[]> {
  const key = [brand, name, concentration].map((part) => part.trim().toLowerCase()).join("|");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.evidence;
  if (pending.has(key)) return pending.get(key)!;
  if (!memoryLimit("performance:scento-lookup", 12, 60)) return [];

  const task = (async () => {
    try {
      const search = await searchLiveFragrances(`${brand} ${name}`);
      const candidates = search.matches
        .filter((item) => sameFragrance({ name, brand }, item))
        .slice(0, 3);
      for (const candidate of candidates) {
        const profile = await getLiveFragrance(candidate.lookup).catch(() => null);
        if (!profile || !sameFragrance({ name, brand }, profile)) continue;
        const wantedConcentration = concentrationKey(concentration);
        const sourceConcentration = concentrationKey(profile.concentration);
        if (
          wantedConcentration && sourceConcentration &&
          wantedConcentration !== sourceConcentration
        ) continue;
        const detailed = await detailedProfile(profile);
        if (detailed.wearEvidence.length) return detailed.wearEvidence;
      }
    } catch {
      // Scento performance is optional; keep the fragrance page available if it is offline.
    }
    return [];
  })().then((evidence) => {
    if (cache.size >= 1024) cache.delete(cache.keys().next().value!);
    const hasValues = evidence.some((item) => item.longevity || item.projection);
    cache.set(key, {
      evidence,
      expires: Date.now() + (hasValues ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000),
    });
    return evidence;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
