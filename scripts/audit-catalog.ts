import { mkdir, writeFile } from "node:fs/promises";
import bundled from "../data/scento-open-catalog.json";
import { curatedCatalog } from "../data/catalog";
import { mapOpenCatalog } from "../lib/server/open-catalog";
import {
  fragranceKey,
  matchingCatalogEdition,
  mergeFragrances,
} from "../lib/catalog";

// Audit every shipped record without crawling the live supplier API.
const records = [...curatedCatalog, ...mapOpenCatalog(bundled)];
const merged = mergeFragrances(curatedCatalog, mapOpenCatalog(bundled));
const retained = new Set(merged.map((f) => f.id));
const removed = records.filter((f) => !retained.has(f.id));
const groups = merged.flatMap((record) => {
  const aliases = removed.filter((f) => matchingCatalogEdition(record, f));
  return aliases.length
    ? [
        {
          retained: { id: record.id, name: record.name, brand: record.brand },
          aliases: aliases.map((f) => ({
            id: f.id,
            name: f.name,
            concentration: f.concentration,
          })),
        },
      ]
    : [];
});
const report = {
  snapshot: "2026-10-29",
  recordsChecked: records.length,
  uniqueEditions: merged.length,
  repeatedRecordsRemoved: removed.length,
  remainingIdentityCollisions:
    merged.length - new Set(merged.map(fragranceKey)).size,
  groups,
};
await mkdir("outputs", { recursive: true });
await writeFile(
  "outputs/catalog-duplicate-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
