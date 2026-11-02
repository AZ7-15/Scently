/** Local development uses a file; Render needs both external database secrets. */
export function databaseConfigured() {
  if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN)
    return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  return process.env.RENDER !== "true";
}
