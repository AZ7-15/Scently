import { mkdir, writeFile } from "node:fs/promises";
import bundled from "../data/scento-open-catalog.json";
import { curatedCatalog } from "../data/catalog";
import { mapOpenCatalog } from "../lib/server/open-catalog";
import { mergeFragrances } from "../lib/catalog";
import { researchedPerformance } from "../lib/server/performance-research";
const catalog = mergeFragrances(curatedCatalog, mapOpenCatalog(bundled));
const editions = catalog.map((f) => ({
  id: f.id,
  name: f.name,
  brand: f.brand,
  concentration: f.concentration,
  evidence: researchedPerformance(f),
}));
const report = {
  checkedAt: "2026-11-03",
  researchSource: "10ML Fragrance Index",
  sourceProfilesChecked: 6018,
  scoredSourceProfiles: 481,
  shippedRecordsChecked: bundled.length + curatedCatalog.length,
  uniqueEditions: catalog.length,
  matchedEditorialAssessments: editions.filter((f) => f.evidence.length).length,
  withoutMatchingAssessment: editions.filter((f) => !f.evidence.length).length,
  editions,
};
await mkdir("outputs", { recursive: true });
await writeFile(
  "outputs/performance-coverage.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, editions: undefined }, null, 2));
