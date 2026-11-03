import { canonicalProductUrl } from "./open-catalog";
import { sourceWearEvidence, type WearEvidence } from "@/lib/wear-evidence";
import { getLiveFragrance } from "./scento";
import type { LiveProfile } from "@/lib/live-catalog";
import { sameFragrance, matchingCatalogEdition } from "@/lib/catalog";
import { memoryLimit } from "./memory-limits";
const cache = new Map<string, { html: string; expires: number }>();
const pending = new Map<string, Promise<string>>();
export async function sourceMarkup(path: string) {
  if (!/^\/(perfumes|note)\/[a-z0-9-]+$/.test(path)) return "";
  const old = cache.get(path);
  if (old && old.expires > Date.now()) return old.html;
  if (pending.has(path)) return pending.get(path)!;
  if (pending.size >= 20 || !memoryLimit("editorial:source", 80, 60)) return "";
  const task = (async () => {
    try {
      const response = await fetch("https://www.scento.com" + path, {
        signal: AbortSignal.timeout(7000),
        redirect: "error",
      });
      if (!response.ok) return "";
      const html = await response.text();
      if (html.length > 2_000_000) return "";
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(path, { html, expires: Date.now() + 15 * 60000 });
      return html;
    } catch {
      return "";
    }
  })().finally(() => pending.delete(path));
  pending.set(path, task);
  return task;
}
export function sourceStream(html: string) {
  return [...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/g)]
    .map((m) => {
      try {
        const a: unknown = JSON.parse(m[1]);
        return Array.isArray(a) && typeof a[1] === "string" ? a[1] : "";
      } catch {
        return "";
      }
    })
    .join("");
}
function objectAfter(text: string, marker: string): unknown {
  const pos = text.indexOf(marker);
  if (pos < 0) return null;
  const start = text.indexOf("{", pos);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let end = start; end < text.length; end++) {
    const ch = text[end];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
export function productFromMarkup(
  html: string,
): Record<string, unknown> | null {
  const raw = objectAfter(sourceStream(html), '"product":{"id":"prod_');
  return raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : null;
}
export type EditorialProfile = LiveProfile & {
  wearEvidence: WearEvidence[];
  imageSourceUrl?: string;
  detailSourceUrl?: string;
  imageUrl: string | null;
  accords: string[];
  detailed: boolean;
};
export function enrichProfile(
  profile: LiveProfile,
  html: string,
): EditorialProfile {
  const result: EditorialProfile = {
    ...profile,
    imageUrl: null,
    wearEvidence: [],
    accords: [profile.family, profile.subfamily].filter(
      (s): s is string => !!s,
    ),
    detailed: false,
  };
  const p = productFromMarkup(html);
  if (!p) return result;
  const brand =
    p.brand && typeof p.brand === "object"
      ? (p.brand as Record<string, unknown>).name
      : p.subtitle;
  if (
    typeof p.title !== "string" ||
    typeof brand !== "string" ||
    !sameFragrance(
      { name: profile.name, brand: profile.brand },
      { name: p.title, brand },
    )
  )
    return result;
  const metadata =
    p.metadata && typeof p.metadata === "object"
      ? (p.metadata as Record<string, unknown>)
      : {};
  if (
    typeof metadata.concentration === "string" &&
    profile.concentration &&
    !matchingCatalogEdition(
      { ...profile, concentration: profile.concentration },
      {
        name: p.title as string,
        brand: brand as string,
        concentration: metadata.concentration,
      },
    )
  )
    return result;
  result.wearEvidence = sourceWearEvidence(metadata, profile.sourceUrl);
  // Supplier pages contain full note stages where the portrait API may list only signature materials.
  if (Array.isArray(p.product_notes)) {
    const pyramid: LiveProfile["pyramid"] = { top: [], heart: [], base: [] };
    const extras: string[] = [];
    for (const row of p.product_notes.slice(0, 80)) {
      if (!row || typeof row !== "object") continue;
      const value = row as Record<string, unknown>;
      const note =
        value.note && typeof value.note === "object"
          ? (value.note as Record<string, unknown>).name
          : null;
      const stage = value.note_type;
      if (typeof note !== "string" || note.length > 200) continue;
      if (stage === "top" || stage === "heart" || stage === "base") {
        if (!pyramid[stage].includes(note)) pyramid[stage].push(note);
      } else if (!extras.includes(note)) extras.push(note);
    }
    if (Object.values(pyramid).some((notes) => notes.length)) {
      result.pyramid = pyramid;
      result.notes = extras;
      result.detailed = true;
    }
  }
  if (typeof p.description === "string" && p.description.length <= 6000) {
    const excerpt = p.description.split(/\s+/).slice(0, 95).join(" ");
    const end = excerpt.lastIndexOf(".");
    result.description = end > 50 ? excerpt.slice(0, end + 1) : excerpt;
  }
  if (p.metadata && typeof p.metadata === "object") {
    const m = p.metadata as Record<string, unknown>;
    const year = Number(m.launch_year);
    if (Number.isInteger(year) && year >= 1700 && year <= 2200)
      result.year = year;
    if (Array.isArray(m.main_accords))
      result.accords = m.main_accords
        .filter((v): v is string => typeof v === "string")
        .slice(0, 10);
  }
  if (typeof p.thumbnail === "string")
    try {
      const image = new URL(p.thumbnail);
      if (
        image.protocol === "https:" &&
        image.hostname === "imagedelivery.net" &&
        !image.pathname.includes("/campaign")
      ) {
        result.imageUrl = image.href;
        result.imageSourceUrl = profile.sourceUrl;
      }
    } catch {}
  return result;
}
export async function detailedProfile(profile: LiveProfile) {
  try {
    let url = new URL(profile.sourceUrl);
    if (url.origin !== "https://www.scento.com")
      return enrichProfile(profile, "");
    if (!/^\/perfumes\/[a-z0-9-]+$/.test(url.pathname)) {
      const indexedUrl = await canonicalProductUrl({
        ...profile,
        concentration: profile.concentration || "",
      });
      if (indexedUrl) url = new URL(indexedUrl);
    }
    if (!/^\/perfumes\/[a-z0-9-]+$/.test(url.pathname)) {
      const canonical = await getLiveFragrance(
        profile.name + " " + profile.brand,
      ).catch(() => null);
      if (
        canonical &&
        matchingCatalogEdition(
          { ...profile, concentration: profile.concentration || "" },
          { ...canonical, concentration: canonical.concentration || "" },
        )
      ) {
        const candidate = new URL(canonical.sourceUrl);
        if (
          candidate.origin === "https://www.scento.com" &&
          /^\/perfumes\/[a-z0-9-]+$/.test(candidate.pathname)
        )
          url = candidate;
      }
    }
    const result = enrichProfile(
      { ...profile, sourceUrl: url.href },
      await sourceMarkup(url.pathname),
    );
    return {
      ...result,
      sourceUrl: profile.sourceUrl,
      detailSourceUrl: result.detailed ? url.href : undefined,
    };
  } catch {
    return enrichProfile(profile, "");
  }
}
