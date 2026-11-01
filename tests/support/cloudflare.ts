import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys=ON");
sqlite.exec(
  readFileSync(
    new URL("../../drizzle/0000_early_paper_doll.sql", import.meta.url),
    "utf8",
  ),
);
class Statement {
  constructor(
    private sql: string,
    private args: unknown[] = [],
  ) {}
  bind(...args: unknown[]) {
    return new Statement(this.sql, args);
  }
  async raw() {
    const s = sqlite.prepare(this.sql);
    s.setReturnArrays(true);
    return s.all(...(this.args as never[]));
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(...(this.args as never[])) };
  }
  async first() {
    return sqlite.prepare(this.sql).get(...(this.args as never[])) ?? null;
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(...(this.args as never[]));
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}
export const env = {
  DB: {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  },
  ADMIN_USER_IDS: "test-admin",
};
