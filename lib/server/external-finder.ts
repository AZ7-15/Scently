import { z } from "zod";
import type { Criteria, Fragrance } from "@/lib/domain";
import {
  brandKey,
  concentrationKey,
  matchingCatalogEdition,
} from "@/lib/catalog";
import type { RecommendationSignal } from "@/lib/discovery";
import { memoryLimit } from "./memory-limits";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  house: z.string().trim().min(1).max(120),
  concentration: z.string().trim().max(80).nullish(),
  gender: z.enum(["men", "women", "unisex"]).nullish(),
  occasions: z
    .array(z.string().max(80))
    .max(20)
    .nullish()
    .transform((value) => value ?? []),
  styles: z
    .array(z.string().max(80))
    .max(30)
    .nullish()
    .transform((value) => value ?? []),
});
const responseSchema = z.object({
  source: z.literal("10ML Fragrance Index"),
  results: z.array(z.unknown()).max(20),
});
export type ExternalIdea = z.infer<typeof profileSchema>;
type SearchResult = { available: boolean; ideas: ExternalIdea[] };
const cache = new Map<string, { value: SearchResult; expires: number }>();
const pending = new Map<string, Promise<SearchResult>>();

export function asksForSensualStyle(message: string) {
  return /\b(seductive|sensual|sexy|alluring|magnetic)\b/i.test(message);
}

function occasionKey(value: string | null) {
  const key = (value || "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .trim();
  return (
    {
      "daily wear": "daytime",
      school: "casual",
      formal: "special occasion",
    }[key] || key
  );
}

export async function searchExternalIdeas(
  message: string,
  criteria: Criteria,
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q: message.trim().slice(0, 200),
    limit: "20",
    format: "detailed",
  });
  if (criteria.style === "masculine") params.set("gender", "men");
  if (criteria.style === "feminine") params.set("gender", "women");
  if (criteria.brand) params.set("house", criteria.brand);
  if (criteria.occasion) params.set("occasion", occasionKey(criteria.occasion));
  if (criteria.season)
    params.set(
      "season",
      criteria.season === "fall" ? "autumn" : criteria.season,
    );
  if (asksForSensualStyle(message)) params.set("style", "sensual");

  const path = "/api/v1/perfumes?" + params.toString();
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(path)) return pending.get(path)!;
  if (!memoryLimit("finder:10ml", 30, 60))
    return { available: false, ideas: [] };

  const task = (async () => {
    try {
      const response = await fetch("https://mcp.10ml.com" + path, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error("10ML unavailable");
      const text = await response.text();
      if (text.length > 1_000_000) throw new Error("10ML response too large");
      const parsed = responseSchema.safeParse(JSON.parse(text));
      if (!parsed.success) throw new Error("Unexpected 10ML response");
      const value = {
        available: true,
        ideas: parsed.data.results.flatMap((result) => {
          const profile = profileSchema.safeParse(result);
          return profile.success ? [profile.data] : [];
        }),
      };
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(path, { value, expires: Date.now() + 15 * 60_000 });
      return value;
    } catch {
      return { available: false, ideas: [] };
    } finally {
      pending.delete(path);
    }
  })();
  pending.set(path, task);
  return task;
}

function exactStrengthMatch(idea: ExternalIdea, fragrance: Fragrance) {
  const wanted = concentrationKey(idea.concentration || idea.name);
  const found = concentrationKey(fragrance.concentration);
  return !wanted || !found || wanted === found;
}

export function matchExternalIdeas(
  ideas: ExternalIdea[],
  candidates: Fragrance[],
  referenceCatalog: Fragrance[] = candidates,
) {
  const signals = new Map<string, RecommendationSignal>();
  for (const [rank, idea] of ideas.entries()) {
    const identity = {
      name: idea.name,
      brand: idea.house,
      concentration: idea.concentration || "Not provided",
    };
    const allMatches = referenceCatalog.filter(
      (fragrance) =>
        matchingCatalogEdition(identity, fragrance) &&
        exactStrengthMatch(idea, fragrance),
    );
    const strengths = new Set(
      allMatches
        .map((fragrance) => concentrationKey(fragrance.concentration))
        .filter(Boolean),
    );
    const ideaStrength = concentrationKey(idea.concentration || idea.name);
    if (!ideaStrength && strengths.size > 1) continue;
    const matched = candidates.filter(
      (fragrance) =>
        matchingCatalogEdition(identity, fragrance) &&
        exactStrengthMatch(idea, fragrance),
    );
    for (const fragrance of matched) {
      if (
        brandKey(fragrance.brand) !== brandKey(idea.house) ||
        signals.has(fragrance.id)
      )
        continue;
      signals.set(fragrance.id, {
        rank,
        gender: idea.gender || null,
        occasions: idea.occasions,
        styles: idea.styles,
      });
    }
  }
  return signals;
}
