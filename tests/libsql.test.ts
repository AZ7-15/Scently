import { it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { createLibsqlDatabase } from "../db/libsql";

it("migrates libSQL, supports returning queries, and rolls back failed batches", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    const db = createLibsqlDatabase(client);
    await Promise.all([
      db.prepare("SELECT 1").first(),
      db.prepare("SELECT 1").first(),
    ]);
    await db
      .prepare("INSERT INTO users (id,display_name,created_at) VALUES (?,?,?)")
      .bind("test", "Tester", new Date().toISOString())
      .run();
    expect(
      await db
        .prepare("SELECT display_name FROM users WHERE id=?")
        .bind("test")
        .first(),
    ).toEqual({ display_name: "Tester" });
    expect(
      await db
        .prepare("SELECT display_name FROM users WHERE id=?")
        .bind("test")
        .raw(),
    ).toEqual([["Tester"]]);
    await expect(
      db.batch([
        db
          .prepare(
            "INSERT INTO sessions (token_hash,user_id,expires) VALUES (?,?,?)",
          )
          .bind("rollback-me", "test", Date.now()),
        db
          .prepare(
            "INSERT INTO users (id,display_name,created_at) VALUES (?,?,?)",
          )
          .bind("test", "Duplicate", "today"),
      ]),
    ).rejects.toThrow();
    expect(await db.prepare("SELECT * FROM sessions").all()).toMatchObject({
      results: [],
    });
    expect(
      await db
        .prepare(
          "INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) RETURNING count",
        )
        .bind("test", Date.now())
        .first(),
    ).toEqual({ count: 1 });
    // Reopening an adapter validates recorded checksums without rerunning DDL.
    expect(
      await createLibsqlDatabase(client)
        .prepare("SELECT count(*) AS n FROM users")
        .first(),
    ).toEqual({ n: 1 });
  } finally {
    client.close();
  }
});
