import { createCustomTrackRepository } from "@/features/custom-tracks/server/repository";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createSessionRepository } from "@/features/sessions/server/repository";
import { defaultAssembly, assemblies } from "@/features/assemblies/assemblies";
import { createInitialSnapshot } from "@/features/session-snapshot/initialSnapshot";

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url)
  throw new Error("Set TEST_DATABASE_URL or DATABASE_URL to run PostgreSQL integration tests.");
const schema = `session_test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: url, max: 1 });
const client = new Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 10 });
const database = drizzle(client);
const repository = createSessionRepository(database);

beforeAll(async () => {
  await admin.query(`create schema "${schema}"`);
  await migrate(database, { migrationsFolder: "./db/migrations", migrationsSchema: schema });
});
afterAll(async () => {
  await client.end();
  await admin.query(`drop schema if exists "${schema}" cascade`);
  await admin.end();
});

describe("PostgreSQL session persistence", () => {
  it("round trips both stores and scopes all operations to the owner", async () => {
    const snapshot = createInitialSnapshot(defaultAssembly);
    snapshot.browser.highlights = [
      {
        id: "saved-highlight",
        region: { start: 10, end: 20 },
        color: "#abcdef",
        opacity: 0.5,
        type: "outlined",
      },
    ];
    const created = await repository.create("owner-a", { name: "Study", snapshot });
    expect((await repository.getByOwner("owner-a", created.id))?.snapshot).toEqual(snapshot);
    expect(await repository.getByOwner("owner-b", created.id)).toBeNull();
    expect(await repository.listByOwner("owner-b")).toEqual([]);
    expect(await repository.deleteByOwner("owner-b", created.id)).toBe(false);
    await expect(
      repository.update("owner-b", { ...created, name: "Hijacked", snapshot }),
    ).rejects.toThrow(/no longer available/);
    expect(await repository.listByOwner("owner-a")).toEqual([
      expect.objectContaining({ id: created.id, name: "Study", trackCount: 2, assemblyId: "hg38" }),
    ]);
    expect(await repository.deleteByOwner("owner-a", created.id)).toBe(true);
    expect(await repository.getByOwner("owner-a", created.id)).toBeNull();
  });

  it("allows only one concurrent update of the same revision and keeps the assembly fixed", async () => {
    const snapshot = createInitialSnapshot(defaultAssembly);
    const created = await repository.create("concurrent-owner", { name: "Initial", snapshot });
    const updates = await Promise.allSettled([
      repository.update("concurrent-owner", { ...created, name: "First", snapshot }),
      repository.update("concurrent-owner", { ...created, name: "Second", snapshot }),
    ]);
    expect(updates.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(updates.filter(({ status }) => status === "rejected")).toHaveLength(1);
    const saved = await repository.getByOwner("concurrent-owner", created.id);
    expect(saved?.revision).toBe(2);
    await expect(
      repository.update("concurrent-owner", {
        id: created.id,
        revision: 2,
        name: "Other assembly",
        snapshot: createInitialSnapshot(assemblies[1]),
      }),
    ).rejects.toThrow(/assembly/);
  });

  it("enforces the five-session limit under concurrent creation", async () => {
    const snapshot = createInitialSnapshot(defaultAssembly);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) =>
        repository.create("limited-owner", { name: `Session ${index}`, snapshot }),
      ),
    );
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(5);
    const list = await repository.listByOwner("limited-owner");
    expect(list).toHaveLength(5);
    await repository.deleteByOwner("limited-owner", list[0].id);
    await expect(
      repository.create("limited-owner", { name: "Replacement", snapshot }),
    ).resolves.toHaveProperty("id");
  });
});

it("persists custom collections independently of sessions and makes creation retries idempotent", async () => {
  const custom = createCustomTrackRepository(database);
  const track = createInitialSnapshot(defaultAssembly).trackStore.tracks[0];
  track.base.id = randomUUID();
  track.source = "user";
  const entry = { assemblyId: "hg38", track };
  await Promise.all([custom.save("custom-owner", entry), custom.save("custom-owner", entry)]);
  expect(await custom.listByOwner("custom-owner")).toEqual([entry]);
  expect(await custom.listByOwner("another-owner")).toEqual([]);
  expect(await repository.listByOwner("custom-owner")).toEqual([]);
});
