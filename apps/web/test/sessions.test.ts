import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { identityMode } from "../features/account/server/identity";
import { createSessions } from "../features/sessions/server/sessions";
import type { SessionInput } from "../features/sessions/schema";
import { sessionsTable } from "../features/sessions/server/table";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

// Real PostgreSQL with the committed migrations; see sessionFixtures.ts.
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let pool: Pool;
let db: NodePgDatabase;

function as(userId: string | null) {
  return createSessions({ db, identity: { userId: async () => userId } });
}

const alice = () => as("user_alice");
const bob = () => as("user_bob");

describe.skipIf(!testServerUrl)("saved sessions", () => {
  beforeAll(async () => {
    database = await createTestDatabase();
    pool = new Pool({ connectionString: database.url });
    db = drizzle({ client: pool });
  });

  afterAll(async () => {
    await pool?.end();
    await database?.drop();
  });

  beforeEach(async () => {
    await db.delete(sessionsTable);
  });

  it("creates a session owned by the acting user and restores its whole snapshot", async () => {
    const before = Date.now();
    const saved = await alice().create({ name: "  Promoter scan ", snapshot: snapshot() });

    expect(saved).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: "Promoter scan",
      createdAt: expect.any(Date),
      updatedAt: saved.createdAt,
    });
    expect(saved.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await alice().load(saved.id)).toEqual({ ...saved, snapshot: snapshot() });
  });

  it("lists only the acting user's sessions, by name and without snapshots", async () => {
    const zebra = await alice().create({ name: "Zebra", snapshot: snapshot() });
    const apple = await alice().create({ name: "Apple", snapshot: snapshot() });
    await bob().create({ name: "Bob's", snapshot: snapshot() });

    expect(await alice().list()).toEqual([apple, zebra]);
    expect((await bob().list()).map(({ name }) => name)).toEqual(["Bob's"]);
  });

  it("hides another user's session from every operation", async () => {
    const saved = await alice().create({ name: "Private", snapshot: snapshot() });
    const edit: SessionInput = { name: "Taken", snapshot: snapshot({ fontSize: 30 }) };

    await expect(bob().load(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bob().update(saved.id, edit)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(bob().remove(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await alice().load(saved.id)).toEqual({ ...saved, snapshot: snapshot() });
  });

  it("rejects signed-out requests before reading or writing", async () => {
    const saved = await alice().create({ name: "Mine", snapshot: snapshot() });
    const anonymous = as(null);
    const input = { name: "Anonymous", snapshot: snapshot() };

    for (const attempt of [
      anonymous.create(input),
      anonymous.list(),
      anonymous.load(saved.id),
      anonymous.update(saved.id, input),
      anonymous.remove(saved.id),
    ])
      await expect(attempt).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await alice().list()).toEqual([saved]);
  });

  it("rejects invalid names and snapshots", async () => {
    const saved = await alice().create({ name: "Valid", snapshot: snapshot() });
    const invalid = { ...snapshot(), browser: { ...snapshot().browser, region: null } };

    await expect(alice().create({ name: "  ", snapshot: snapshot() })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(
      alice().update(saved.id, { name: "Valid", snapshot: invalid as never }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(await alice().list()).toEqual([saved]);
  });

  it("updates the name and snapshot in place", async () => {
    const saved = await alice().create({ name: "Draft", snapshot: snapshot() });
    const edited = snapshot({
      region: { chromosome: "chr7", start: 10, end: 500 },
      highlights: [],
    });
    edited.tracks.reverse();
    edited.pinnedTrackIds = [];
    // Timestamps have millisecond precision in JavaScript.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await alice().update(saved.id, { name: "Final", snapshot: edited });

    expect(updated).toMatchObject({ id: saved.id, name: "Final", createdAt: saved.createdAt });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(saved.updatedAt.getTime());
    expect(await alice().load(saved.id)).toEqual({ ...updated, snapshot: edited });
  });

  it("keeps a session's assembly, including under concurrent writes", async () => {
    const saved = await alice().create({ name: "Human", snapshot: snapshot() });
    const mouse = snapshot({ assembly: "mm10", region: { chromosome: "chr1", start: 0, end: 10 } });

    await expect(
      alice().update(saved.id, { name: "Mouse", snapshot: mouse }),
    ).rejects.toMatchObject({ code: "ASSEMBLY_CHANGED" });

    const writes = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        alice().update(saved.id, {
          name: `Write ${index}`,
          snapshot: index % 2 ? mouse : snapshot({ fontSize: index + 1 }),
        }),
      ),
    );
    expect(writes.filter(({ status }) => status === "fulfilled")).toHaveLength(5);
    expect((await alice().load(saved.id)).snapshot.browser.assembly).toBe("hg38");
  });

  it("never recreates a missing or deleted session", async () => {
    const saved = await alice().create({ name: "Short-lived", snapshot: snapshot() });
    const input = { name: "Autosave", snapshot: snapshot() };
    await alice().remove(saved.id);

    await expect(alice().update(saved.id, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(alice().load(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(alice().remove(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      alice().update("00000000-0000-4000-8000-000000000000", input),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(alice().load("local")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await alice().list()).toEqual([]);
  });
});

describe("identity selection", () => {
  it("uses mock users only when explicitly enabled outside production", () => {
    expect(identityMode({ NODE_ENV: "development" })).toBe("clerk");
    expect(identityMode({ NODE_ENV: "development", GB_IDENTITY: "mock" })).toBe("mock");
    expect(() => identityMode({ NODE_ENV: "production", GB_IDENTITY: "mock" })).toThrow(
      "Mock identity is unavailable in production",
    );
    expect(() => identityMode({ NODE_ENV: "development", GB_IDENTITY: "mok" })).toThrow(
      "GB_IDENTITY must be",
    );
  });
});
