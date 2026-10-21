import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importSqliteSessions } from "../scripts/importSqliteSessions";
import { createSessions } from "../features/sessions/server/sessions";
import { createTestDatabase, createTestPool, snapshot, testServerUrl } from "./sessionFixtures";

describe.skipIf(!testServerUrl)("importing SQLite sessions", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let connection: ReturnType<typeof createTestPool>;
  let db: NodePgDatabase;
  let directory: string;
  let sqlitePath: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    connection = createTestPool(database.url);
    db = drizzle({ client: connection.pool });
    directory = await mkdtemp(join(tmpdir(), "gb-import-"));
    sqlitePath = join(directory, "browser.sqlite");
    // The old browser server's table, with a valid and an unreadable snapshot.
    const sqlite = new DatabaseSync(sqlitePath);
    sqlite.exec("CREATE TABLE sessions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)");
    const insert = sqlite.prepare("INSERT INTO sessions VALUES (?, ?)");
    insert.run("local", JSON.stringify(snapshot()));
    insert.run("niship", JSON.stringify(snapshot({ fontSize: 20 })));
    insert.run("broken", "{}");
    sqlite.close();
  });

  afterAll(async () => {
    await connection?.close();
    await database?.drop();
    await rm(directory, { recursive: true, force: true });
  });

  const sessionsOf = (userId: string) =>
    createSessions({ db, identity: { userId: async () => userId } });

  it("copies sessions to the named owner only, once, leaving the SQLite file unchanged", async () => {
    const before = readFileSync(sqlitePath);
    const result = await importSqliteSessions({ db, sqlitePath, owner: "user_alice" });
    expect(result).toEqual({ imported: ["local", "niship"], skipped: [], invalid: ["broken"] });

    const alice = sessionsOf("user_alice");
    const listed = await alice.list();
    expect(listed.map(({ name }) => name)).toEqual(["local", "niship"]);
    expect(listed.every(({ id }) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
    const niship = listed.find(({ name }) => name === "niship")!;
    expect((await alice.load(niship.id)).snapshot).toEqual(snapshot({ fontSize: 20 }));
    expect(await sessionsOf("user_bob").list()).toEqual([]);

    expect(await importSqliteSessions({ db, sqlitePath, owner: "user_alice" })).toEqual({
      imported: [],
      skipped: ["local", "niship"],
      invalid: ["broken"],
    });
    expect(await alice.list()).toHaveLength(2);
    expect(readFileSync(sqlitePath).equals(before)).toBe(true);
  });

  it("copies only the selected sessions and rejects unknown ones", async () => {
    expect(
      await importSqliteSessions({ db, sqlitePath, owner: "user_bob", sessionIds: ["niship"] }),
    ).toEqual({ imported: ["niship"], skipped: [], invalid: [] });
    await expect(
      importSqliteSessions({ db, sqlitePath, owner: "user_bob", sessionIds: ["missing"] }),
    ).rejects.toThrow("Not in the SQLite file: missing");
    expect((await sessionsOf("user_bob").list()).map(({ name }) => name)).toEqual(["niship"]);
  });
});
