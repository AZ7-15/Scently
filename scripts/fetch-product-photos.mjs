import { readFile, mkdir, writeFile } from "node:fs/promises";
const sources = JSON.parse(
  await readFile(
    new URL("../data/photo-sources.json", import.meta.url),
    "utf8",
  ),
);
const destination = new URL("../public/images/products/", import.meta.url);
await mkdir(destination, { recursive: true });
for (const photo of sources) {
  const response = await fetch(photo.image, {
    signal: AbortSignal.timeout(20000),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new Error(`Image unavailable: ${photo.id} (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 10_000_000)
    throw new Error(`Image exceeds limit: ${photo.id}`);
  await writeFile(new URL(photo.file, destination), buffer);
  console.log(`${photo.id}: ${buffer.length} bytes`);
}
