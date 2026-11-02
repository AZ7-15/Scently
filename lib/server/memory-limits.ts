const buckets = new Map<string, { count: number; expires: number }>();
/** Bounded process-local limits for public lookups, including setup mode. */
export function memoryLimit(key: string, limit: number, seconds: number) {
  const now = Date.now();
  for (const [id, value] of buckets)
    if (value.expires <= now) buckets.delete(id);
  const existing = buckets.get(key);
  if (!existing && buckets.size >= 2000) return false;
  const bucket = existing ?? { count: 0, expires: now + seconds * 1000 };
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count <= limit;
}
