export type WearEvidence = {
  source: string;
  sourceUrl: string;
  checkedAt: string;
  kind: "editorial" | "source-report";
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
    very_weak: "Very short",
    weak: "Short",
    moderate: "Moderate",
    long_lasting: "Long-lasting",
    eternal: "Very long-lasting",
  };
  const trail: Record<string, string> = {
    intimate: "Intimate",
    moderate: "Moderate",
    strong: "Strong",
    enormous: "Very strong",
  };
  const wear =
    typeof metadata.longevity === "string"
      ? longevity[metadata.longevity]
      : null;
  const projection =
    typeof metadata.sillage === "string" ? trail[metadata.sillage] : null;
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
