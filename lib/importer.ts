import { fragranceSchema, normalize } from "./domain";
// RFC 4180-style quoting, including commas and newlines inside quoted cells.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quotation.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((x) => x.trim().replace(/^\uFEFF/, ""));
  if (!headers?.length) throw new Error("CSV needs a header row.");
  if (new Set(headers).size !== headers.length)
    throw new Error("Duplicate CSV headers.");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`CSV row ${i + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}
export function prepareImport(content: string, format: "json" | "csv") {
  const raw: unknown =
    format === "csv" ? parseCsv(content) : JSON.parse(content);
  if (!Array.isArray(raw) || raw.length > 100)
    throw new Error("Import a list of at most 100 records.");
  const seen = new Set<string>();
  const errors: { row: number; message: string }[] = [];
  const records = raw.flatMap((value, index) => {
    try {
      const item = { ...value };
      if (format === "csv") {
        for (const k of ["accords", "notes", "editorialSeasons", "occasions"])
          if (item[k]) item[k] = JSON.parse(item[k]);
        for (const k of ["year"]) item[k] = item[k] ? Number(item[k]) : null;
        for (const k of ["imageUrl", "perfumer"]) item[k] = item[k] || null;
        item.demo = item.demo === "true";
      }
      const f = fragranceSchema.parse(item);
      f.brand = f.brand.trim().replace(/\s+/g, " ");
      f.notes = f.notes.map((n) => ({
        ...n,
        name: n.name.trim().replace(/\s+/g, " "),
      }));
      const key = normalize(`${f.brand}|${f.name}|${f.concentration}`);
      if (seen.has(key) || seen.has(f.slug) || seen.has(`id:${f.id}`))
        throw new Error("Duplicate fragrance in this import.");
      seen.add(key);
      seen.add(f.slug);
      seen.add(`id:${f.id}`);
      return [f];
    } catch (e) {
      errors.push({ row: index + 1, message: (e as Error).message });
      return [];
    }
  });
  return { records, errors };
}
