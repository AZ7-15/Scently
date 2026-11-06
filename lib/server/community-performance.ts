import { sameFragrance } from "@/lib/catalog";
import type { WearEvidence } from "@/lib/wear-evidence";
import { memoryLimit } from "./memory-limits";
import { getScentoWearPerformance } from "./scento-performance";

const endpoint = "https://jdkwlwyysgofljkobpmr.supabase.co/functions/v1/mcp";
const cache = new Map<string, { evidence: WearEvidence[]; expires: number }>();
const pending = new Map<string, Promise<WearEvidence[]>>();

function parseMessage(text: string) {
  const line = text.split(/\r?\n/).find((part) => part.startsWith("data: "));
  if (!line) return null;
  try {
    const message = JSON.parse(line.slice(6)) as {
      error?: unknown;
      result?: { isError?: boolean; content?: { type?: string; text?: string }[] };
    };
    if (message.error || message.result?.isError) return null;
    const body = message.result?.content?.find((part) => part.type === "text")?.text;
    return body ? JSON.parse(body) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function score(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5
    ? Math.round(value * 10) / 10
    : null;
}

async function getPerfumePicksPerformance(
  name: string,
  brand: string,
  concentration: string,
): Promise<WearEvidence[]> {
  const key = [brand.toLowerCase(), name.toLowerCase(), concentration.toLowerCase()].join("|");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.evidence;
  if (pending.has(key)) return pending.get(key)!;
  if (!memoryLimit("performance:community-api", 30, 60)) return [];

  const task = (async () => {
    let evidence: WearEvidence[] = [];
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "get_fragrance",
            arguments: { slug_or_name: brand + " " + name },
          },
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok || Number(response.headers.get("content-length") || 0) > 200_000)
        return [];
      const body = await response.text();
      if (body.length > 200_000) return [];
      const payload = parseMessage(body);
      const fragrance = payload?.fragrance;
      if (!fragrance || typeof fragrance !== "object") return [];
      const record = fragrance as Record<string, unknown>;
      if (
        typeof record.name !== "string" ||
        typeof record.brand !== "string" ||
        typeof record.concentration !== "string" ||
        !sameFragrance(
          { name, brand, concentration },
          {
            name: record.name,
            brand: record.brand,
            concentration: record.concentration,
          },
        )
      ) return [];
      const metrics = record.community_scores;
      if (!metrics || typeof metrics !== "object") return [];
      const scores = metrics as Record<string, unknown>;
      const longevityScore = score(scores.longevity);
      const projectionScore = score(scores.sillage);
      if (!longevityScore && !projectionScore) return [];

      const attribution = payload?.attribution;
      const attributionRecord =
        attribution && typeof attribution === "object"
          ? attribution as Record<string, unknown>
          : {};
      const links = attributionRecord.links;
      let sourceUrl = "https://perfumepicks.app/";
      const candidateUrl =
        links && typeof links === "object"
          ? (links as Record<string, unknown>).website
          : null;
      if (typeof candidateUrl === "string") {
        try {
          const candidate = new URL(candidateUrl);
          if (candidate.origin === "https://perfumepicks.app")
            sourceUrl = candidate.href;
        } catch {
          // Keep the trusted provider home page as the citation.
        }
      }
      const source = typeof attributionRecord.source === "string"
        ? attributionRecord.source
        : "Perfume Picks community data";
      const retrieved = typeof attributionRecord.retrieved_at === "string"
        ? new Date(attributionRecord.retrieved_at)
        : new Date();
      const checkedAt = Number.isFinite(retrieved.getTime())
        ? retrieved.toISOString()
        : new Date().toISOString();
      evidence = [{
        source,
        sourceUrl,
        checkedAt,
        kind: "community",
        longevity: null,
        projection: null,
        longevityScore: longevityScore || undefined,
        projectionScore: projectionScore || undefined,
      }];
    } catch {
      // Keep the detail page available if the public data service is down.
    }
    return evidence;
  })().then((evidence) => {
    if (cache.size >= 1024) cache.delete(cache.keys().next().value!);
    cache.set(key, {
      evidence,
      expires: Date.now() + (evidence.length ? 7 : 2) * 24 * 60 * 60 * 1000,
    });
    return evidence;
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export async function getCommunityPerformance(
  name: string,
  brand: string,
  concentration: string,
  sourcedWearEvidence?: WearEvidence[],
): Promise<WearEvidence[]> {
  const [scento, perfumePicks] = await Promise.all([
    sourcedWearEvidence === undefined
      ? getScentoWearPerformance(name, brand, concentration)
      : Promise.resolve(sourcedWearEvidence),
    getPerfumePicksPerformance(name, brand, concentration),
  ]);
  return [...scento, ...perfumePicks];
}
