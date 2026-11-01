import type { Client, InValue, ResultSet } from "@libsql/client";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Adapts our existing parameterized query layer to an external libSQL database. */
export function createLibsqlDatabase(client: Client): D1Database {
  let initializing: Promise<void> | undefined;
  async function initialize() {
    const transaction = await client.transaction("write");
    try {
      await transaction.execute(
        "CREATE TABLE IF NOT EXISTS _scently_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
      );
      for (const name of readdirSync(join(process.cwd(), "drizzle"))
        .filter((n) => n.endsWith(".sql"))
        .sort()) {
        const sql = readFileSync(join(process.cwd(), "drizzle", name), "utf8");
        const checksum = createHash("sha256").update(sql).digest("hex");
        const previous = await transaction.execute({
          sql: "SELECT checksum FROM _scently_migrations WHERE name=?",
          args: [name],
        });
        if (previous.rows[0] && previous.rows[0].checksum !== checksum)
          throw new Error(`Migration ${name} was changed after being applied.`);
        if (!previous.rows.length) {
          await transaction.executeMultiple(sql);
          await transaction.execute({
            sql: "INSERT INTO _scently_migrations VALUES (?,?)",
            args: [name, checksum],
          });
        }
      }
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    } finally {
      transaction.close();
    }
  }
  function ready() {
    return (initializing ??= initialize().catch((e) => {
      initializing = undefined;
      throw e;
    }));
  }
  function result(data: ResultSet) {
    return {
      success: true,
      results: data.rows.map((row) =>
        Object.fromEntries(data.columns.map((column) => [column, row[column]])),
      ),
      meta: { changes: data.rowsAffected },
    };
  }
  class Statement {
    constructor(
      public sql: string,
      public args: InValue[] = [],
    ) {}
    bind(...args: InValue[]) {
      return new Statement(this.sql, args);
    }
    async query() {
      await ready();
      return client.execute({ sql: this.sql, args: this.args });
    }
    async all() {
      return result(await this.query());
    }
    async run() {
      return this.all();
    }
    async raw() {
      const data = await this.query();
      return data.rows.map((row) => data.columns.map((column) => row[column]));
    }
    async first<T = Record<string, unknown>>() {
      return ((await this.all()).results[0] ?? null) as T | null;
    }
  }
  return {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      await ready();
      return (
        await client.batch(
          statements.map((s) => ({ sql: s.sql, args: s.args })),
          "write",
        )
      ).map(result);
    },
  } as unknown as D1Database;
}
