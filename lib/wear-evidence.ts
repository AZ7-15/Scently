export type WearEvidence = {
  source: string;
  sourceUrl: string;
  checkedAt: string;
  kind: "editorial" | "source-report" | "community";
  longevity: string | null;
  projection: string | null;
  longevityScore?: number;
  projectionScore?: number;
};

export function sourceWearEvidence(
  metadata: Record<string, unknown>,
  sourceUrl: string,
): WearEvidence[] {
  const longevity: Record<string, string> = {
    very_weak: "1–2 hours",
    weak: "2–4 hours",
    moderate: "4–6 hours",
    long_lasting: "6–8 hours",
    eternal: "8+ hours",
  };
  const trail: Record<string, string> = {
    soft: "Soft",
    intimate: "Intimate",
    moderate: "Moderate",
    strong: "Strong",
    enormous: "Enormous",
  };
  const wear = typeof metadata.longevity === "string"
    ? longevity[metadata.longevity.toLowerCase().replace(/[ -]+/g, "_")]
    : null;
  const projection =
    typeof metadata.sillage === "string"
      ? trail[metadata.sillage.toLowerCase()]
      : null;
  return wear || projection
    ? [
        {
          source: "Scento product profile",
          sourceUrl,
          checkedAt: new Date().toISOString(),
          kind: "source-report",
          longevity: wear || null,
          projection: projection || null,
        },
      ]
    : [];
}
