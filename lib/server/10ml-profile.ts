import { z } from "zod";
import { concentrationKey, matchingCatalogEdition } from "@/lib/catalog";
import type { LiveProfile } from "@/lib/live-catalog";
import { memoryLimit } from "./memory-limits";

const strings = z.array(z.string().trim().min(1).max(200)).max(80).nullish();
const ideaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  house: z.string().trim().min(1).max(120),
  concentration: z.string().trim().max(80).nullish(),
  family: z.string().trim().max(120).nullish(),
  character: z.string().trim().max(3000).nullish(),
  key_notes: strings,
  pyramid: z.object({ top: strings, heart: strings, base: strings }).nullish(),
  seasons: strings,
});
const responseSchema = z.object({
  source: z.literal("10ML Fragrance Index"),
  results: z.array(z.unknown()).max(20),
});
const cache = new Map<string, { value: LiveProfile | null; expires: number }>();
const pending = new Map<string, Promise<LiveProfile | null>>();

/** Recover a verified profile when the primary source resolves to another edition. */
export async function findExactEditorialProfile(identity: {
  name: string;
  brand: string;
  concentration?: string | null;
}): Promise<LiveProfile | null> {
  const query = identity.brand + " " + identity.name;
  const cached = cache.get(query);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (pending.has(query)) return pending.get(query)!;
  if (!memoryLimit("profile:10ml", 30, 60)) return null;

  const task = (async () => {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: "20",
        format: "detailed",
      });
      const response = await fetch(
        "https://mcp.10ml.com/api/v1/perfumes?" + params,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(7000),
        },
      );
      if (!response.ok) return null;
      const text = await response.text();
      if (text.length > 1_000_000) return null;
      const parsed = responseSchema.safeParse(JSON.parse(text));
      if (!parsed.success) return null;
      const matches = parsed.data.results.flatMap((result) => {
        const profile = ideaSchema.safeParse(result);
        if (!profile.success) return [];
        return matchingCatalogEdition(
          {
            name: identity.name,
            brand: identity.brand,
            concentration: identity.concentration || "Not provided",
          },
          {
            name: profile.data.name,
            brand: profile.data.house,
            concentration: profile.data.concentration || "Not provided",
          },
        )
          ? [profile.data]
          : [];
      });
      const strengths = new Set(
        matches.map((profile) => profile.concentration?.toLowerCase() || ""),
      );
      if (!identity.concentration && strengths.size > 1) return null;
      const selected = identity.concentration
        ? matches.find(
            (profile) =>
              concentrationKey(profile.concentration) ===
              concentrationKey(identity.concentration),
          ) || matches[0]
        : matches[0];
      if (!selected) return null;

      const pyramid = {
        top: selected.pyramid?.top || [],
        heart: selected.pyramid?.heart || [],
        base: selected.pyramid?.base || [],
      };
      const classified = new Set(
        Object.values(pyramid)
          .flat()
          .map((n) => n.toLowerCase()),
      );
      const sourceUrl =
        "https://10ml.com/search?q=" +
        encodeURIComponent(selected.house + " " + selected.name);
      return {
        name: selected.name,
        brand: selected.house,
        year: null,
        perfumer: null,
        concentration: selected.concentration || null,
        family: selected.family || "Not provided",
        subfamily: null,
        description:
          selected.character ||
          "The source has not provided a scent description.",
        pyramid,
        notes: (selected.key_notes || []).filter(
          (note) => !classified.has(note.toLowerCase()),
        ),
        seasons: selected.seasons || [],
        sourceUrl,
        checkedAt: new Date().toISOString(),
        source: "10ML Fragrance Index",
      } satisfies LiveProfile;
    } catch {
      return null;
    } finally {
      pending.delete(query);
    }
  })();
  pending.set(query, task);
  const value = await task;
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(query, { value, expires: Date.now() + 15 * 60_000 });
  return value;
}
