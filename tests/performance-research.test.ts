import { expect, it } from "vitest";
import { sourceWearEvidence } from "../lib/wear-evidence";
it("takes only disclosed source categories without importing ratings, counts or invented hours", () => {
  const evidence = sourceWearEvidence(
    {
      longevity: "long_lasting",
      sillage: "strong",
      fragrantica_rating: 4.58,
      json_longevity: { long_lasting: 7926 },
    },
    "https://www.scento.com/perfumes/example",
  );
  expect(evidence[0]).toMatchObject({
    kind: "source-report",
    longevity: "Long-lasting",
    projection: "Strong",
  });
  expect(evidence[0]).not.toHaveProperty("rating");
  expect(evidence[0]).not.toHaveProperty("votes");
  expect(
    sourceWearEvidence(
      { longevity: "unknown", sillage: 900 },
      "https://www.scento.com/perfumes/example",
    ),
  ).toEqual([]);
});
