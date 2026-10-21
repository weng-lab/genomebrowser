import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { identityMode } from "../features/account/server/identity";
import { createSessions } from "../features/sessions/server/sessions";
import type { SessionInput, SessionUpdate } from "../features/sessions/schema";
import { sessionsTable } from "../features/sessions/server/table";
import { createTestDatabase, createTestPool, snapshot, testServerUrl } from "./sessionFixtures";

// Real PostgreSQL with the committed migrations; see sessionFixtures.ts.
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let connection: ReturnType<typeof createTestPool>;
let db: NodePgDatabase;

function as(userId: string | null) {
  return createSessions({ db, identity: { userId: async () => userId } });
}

function at(revision: number, input: SessionInput, saveId = crypto.randomUUID()): SessionUpdate {
  return { ...input, revision, saveId };
}

const alice = () => as("user_alice");
const bob = () => as("user_bob");

describe.skipIf(!testServerUrl)("saved sessions", () => {
  beforeAll(async () => {
    database = await createTestDatabase();
    connection = createTestPool(database.url);
    db = drizzle({ client: connection.pool });
  });

  afterAll(async () => {
    await connection?.close();
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
      revision: 1,
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
    const edit = at(1, { name: "Taken", snapshot: snapshot({ fontSize: 30 }) });

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
      anonymous.update(saved.id, at(1, input)),
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
      alice().update(saved.id, at(1, { name: "Valid", snapshot: invalid as never })),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(
      alice().update(saved.id, { name: "Valid", snapshot: snapshot() } as never),
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

    const updated = await alice().update(saved.id, at(1, { name: "Final", snapshot: edited }));

    expect(updated).toMatchObject({
      id: saved.id,
      name: "Final",
      createdAt: saved.createdAt,
      revision: 2,
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(saved.updatedAt.getTime());
    expect(await alice().load(saved.id)).toEqual({ ...updated, snapshot: edited });
  });

  it("keeps a session's assembly, including under concurrent writes", async () => {
    const saved = await alice().create({ name: "Human", snapshot: snapshot() });
    const mouse = snapshot({ assembly: "mm10", region: { chromosome: "chr1", start: 0, end: 10 } });

    await expect(
      alice().update(saved.id, at(1, { name: "Mouse", snapshot: mouse })),
    ).rejects.toMatchObject({ code: "ASSEMBLY_CHANGED" });

    const writes = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        alice().update(
          saved.id,
          at(1, { name: `Write ${index}`, snapshot: index % 2 ? mouse : snapshot() }),
        ),
      ),
    );
    const codes = writes.map((write) => (write.status === "rejected" ? write.reason.code : "OK"));
    expect(codes.filter((code, index) => index % 2 && code !== "ASSEMBLY_CHANGED")).toEqual([]);
    expect(codes.filter((code) => code === "OK")).toHaveLength(1);
    expect((await alice().load(saved.id)).snapshot.browser.assembly).toBe("hg38");
  });

  it("applies one of several concurrent writes at the same revision, and rejects the rest as conflicts", async () => {
    const saved = await alice().create({ name: "Shared", snapshot: snapshot() });
    const writes = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        alice().update(saved.id, at(1, { name: `Tab ${index}`, snapshot: snapshot() })),
      ),
    );

    const applied = writes.flatMap((write) => (write.status === "fulfilled" ? [write.value] : []));
    expect(applied).toHaveLength(1);
    expect(applied[0].revision).toBe(2);
    const rejected = writes.flatMap((write) => (write.status === "rejected" ? [write.reason] : []));
    expect(rejected.map(({ code }) => code)).toEqual(Array(9).fill("CONFLICT"));
    expect(await alice().load(saved.id)).toMatchObject({ name: applied[0].name, revision: 2 });
  });

  it("returns the result of a retried save without applying it again", async () => {
    const saved = await alice().create({ name: "Draft", snapshot: snapshot() });
    const write = at(1, { name: "Edited", snapshot: snapshot({ fontSize: 20 }) });
    const first = await alice().update(saved.id, write);

    const retries = await Promise.all(
      Array.from({ length: 5 }, () => alice().update(saved.id, write)),
    );
    for (const retry of retries) expect(retry).toEqual(first);
    expect(await alice().load(saved.id)).toEqual({ ...first, snapshot: write.snapshot });

    const next = at(2, { name: "Again", snapshot: snapshot({ fontSize: 21 }) });
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => alice().update(saved.id, next)),
    );
    expect(new Set(attempts.map(({ revision }) => revision))).toEqual(new Set([3]));
  });

  it("refuses a retried save after a newer write, leaving the newer one", async () => {
    const saved = await alice().create({ name: "Draft", snapshot: snapshot() });
    const stale = at(1, { name: "Stale", snapshot: snapshot({ fontSize: 20 }) });
    await alice().update(saved.id, stale);
    const newer = await alice().update(
      saved.id,
      at(2, { name: "Newer", snapshot: snapshot({ fontSize: 30 }) }),
    );

    await expect(alice().update(saved.id, stale)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      alice().update(saved.id, at(1, { name: "Old base", snapshot: snapshot() })),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await alice().load(saved.id)).toEqual({
      ...newer,
      snapshot: snapshot({ fontSize: 30 }),
    });
    expect(newer.revision).toBe(3);
  });

  it("never recreates a missing or deleted session", async () => {
    const saved = await alice().create({ name: "Short-lived", snapshot: snapshot() });
    const input = at(1, { name: "Autosave", snapshot: snapshot() });
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
