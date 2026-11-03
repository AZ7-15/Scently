import { expect, it } from "vitest";
import { researchedPerformance } from "../lib/server/performance-research";
import { sourceWearEvidence } from "../lib/wear-evidence";

it("keeps researched scores specific to the edition and separate from hour measurements", () => {
  const edp = researchedPerformance({
    name: "Sauvage",
    brand: "Dior",
    concentration: "EDP",
  });
  const edt = researchedPerformance({
    name: "Sauvage Eau de Toilette",
    brand: "Christian Dior",
    concentration: "EDT",
  });
  expect(edp[0]).toMatchObject({
    kind: "editorial",
    longevityScore: 4,
    projectionScore: 4,
    source: "10ML Fragrance Index",
  });
  expect(edt[0].projectionScore).toBe(5);
  expect(edp[0]).not.toHaveProperty("hours");
  expect(
    researchedPerformance({
      name: "Sauvage",
      brand: "Dior",
      concentration: "Not provided",
    }),
  ).toEqual([]);
  expect(
    researchedPerformance({
      name: "Sauvage",
      brand: "Dior",
      concentration: "EDC",
    }),
  ).toEqual([]);
  expect(
    researchedPerformance({
      name: "Sauvage",
      brand: "Another brand",
      concentration: "EDP",
    }),
  ).toEqual([]);
});
it("uses verified house aliases without transferring scores to another flanker", () => {
  expect(
    researchedPerformance({
      name: "Emporio Armani Stronger With You Intensely",
      brand: "Giorgio Armani",
      concentration: "EDP",
    })[0].longevityScore,
  ).toBe(4);
  expect(
    researchedPerformance({
      name: "Stronger With You Absolutely",
      brand: "Giorgio Armani",
      concentration: "Parfum",
    }),
  ).toEqual([]);
});
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
