import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client/web";
import { createLibsqlDatabase } from "./libsql";

// Keep the existing query layer while running SQLite in a persistent Node process.
class Statement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private args: SQLInputValue[] = [],
  ) {}
  bind(...args: SQLInputValue[]) {
    return new Statement(this.db, this.sql, args);
  }
  async raw() {
    const query = this.db.prepare(this.sql);
    query.setReturnArrays(true);
    return query.all(...this.args);
  }
  execute() {
    const query = this.db.prepare(this.sql);
    const results = query.columns().length ? query.all(...this.args) : [];
    if (!query.columns().length) query.run(...this.args);
    return {
      success: true,
      results,
      meta: {
        changes: Number(this.db.prepare("SELECT changes() AS n").get()!.n),
      },
    };
  }
  async all() {
    return this.execute();
  }
  async first<T = Record<string, unknown>>() {
    return (this.db.prepare(this.sql).get(...this.args) ?? null) as T | null;
  }
  async run() {
    return this.execute();
  }
}

let database: D1Database | undefined;
function openDatabase(): D1Database {
  if (process.env.TURSO_DATABASE_URL) {
    if (!process.env.TURSO_AUTH_TOKEN)
      throw new Error(
        "TURSO_AUTH_TOKEN is required for the external database.",
      );
    return createLibsqlDatabase(
      createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    );
  }
  const location = process.env.SCENTLY_DB_PATH || "./storage/scently.sqlite";
  if (process.env.RENDER === "true")
    throw new Error(
      "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Render must use an external database to preserve data.",
    );
  if (location !== ":memory:")
    mkdirSync(dirname(resolve(location)), { recursive: true });
  const sqlite = new DatabaseSync(location);
  sqlite.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
  );
  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS _scently_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
  );
  for (const name of readdirSync(join(process.cwd(), "drizzle"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(join(process.cwd(), "drizzle", name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const previous = sqlite
        .prepare("SELECT checksum FROM _scently_migrations WHERE name=?")
        .get(name);
      if (previous && previous.checksum !== checksum)
        throw new Error(`Migration ${name} was changed after being applied.`);
      if (!previous) {
        sqlite.exec(sql);
        sqlite
          .prepare("INSERT INTO _scently_migrations VALUES (?,?)")
          .run(name, checksum);
      }
      sqlite.exec("COMMIT");
    } catch (e) {
      sqlite.exec("ROLLBACK");
      sqlite.close();
      throw e;
    }
  }
  return {
    prepare: (sql: string) => new Statement(sqlite, sql),
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        // Execute synchronously inside the transaction: no request can interleave.
        const results = statements.map((statement) => statement.execute());
        sqlite.exec("COMMIT");
        return results;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
}
export const env = {
  get DB(): D1Database {
    return (database ??= openDatabase());
  },
};
