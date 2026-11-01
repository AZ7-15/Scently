export {};
const seedOrigin = process.env.SEED_BASE_URL || "http://127.0.0.1:5173";
if (process.argv.includes("--remote"))
  throw new Error(
    "Seed through an authenticated hosted catalog request. This command is local-only.",
  );
if (!["127.0.0.1", "localhost"].includes(new URL(seedOrigin).hostname))
  throw new Error("SEED_BASE_URL must use loopback.");
const response = await fetch(seedOrigin + "/api/catalog");
if (!response.ok)
  throw new Error(
    `Seed failed (${response.status}). Apply migrations and start the server first.`,
  );
console.log(
  "Catalog seeded without fabricated reviews, performance measurements, or offers.",
);
