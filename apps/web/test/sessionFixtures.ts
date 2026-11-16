import type { SessionSnapshot } from "../features/sessions/snapshot.ts";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, DatabaseError, Pool } from "pg";

/** PostgreSQL server for the database tests. They are skipped without it, except in CI. */
export const testServerUrl = process.env.GB_TEST_DATABASE_URL;
if (process.env.CI && !testServerUrl) throw new Error("CI must set GB_TEST_DATABASE_URL");

async function admin(statement: string) {
  const client = new Client({ connectionString: testServerUrl });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}

/**
 * A pool that tolerates `drop`. `end` resolves before its connections close, and
 * dropping the database terminates any still closing. Unhandled, that error
 * would fail the test run.
 */
function droppablePool(url: string) {
  const pool = new Pool({ connectionString: url });
  pool.on("error", (error) => {
    const terminated = error instanceof DatabaseError && error.code === "57P01";
    if (!terminated) throw error;
  });
  return pool;
}

/** Creates a database with the committed migrations applied. Call `drop` when done. */
export async function createTestDatabase() {
  const name = `gb_test_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await admin(`CREATE DATABASE ${name}`);
  const url = new URL(testServerUrl!);
  url.pathname = `/${name}`;
  const migrations = droppablePool(url.toString());
  try {
    await migrate(drizzle({ client: migrations }), {
      migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
    });
  } finally {
    await migrations.end();
  }
  const pools: Pool[] = [];
  return {
    url: url.toString(),
    /** A client for this database, closed by `drop`. */
    connect(): NodePgDatabase {
      const pool = droppablePool(url.toString());
      pools.push(pool);
      return drizzle({ client: pool });
    },
    async drop() {
      await Promise.all(pools.map((pool) => pool.end()));
      await admin(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    },
  };
}

/** A valid hg38 snapshot that exercises every saved field. */
export function snapshot(overrides: Partial<SessionSnapshot["browser"]> = {}): SessionSnapshot {
  return {
    version: 1,
    browser: {
      assembly: "hg38",
      region: { chromosome: "chr2", start: 1000, end: 2000 },
      basePairDetail: { maxVisibleBases: 250 },
      marginWidth: 130,
      trackWidth: 1000,
      fontSize: 15,
      titleSize: 17,
      highlights: [
        {
          id: "promoter",
          region: { chromosome: "chr2", start: 1100, end: 1200 },
          color: "#123456",
        },
        { id: "enhancer", region: { start: 1500, end: 1600 }, color: "#abcdef", opacity: 0.4 },
      ],
      selectionMode: "highlight",
      selectionHighlight: { color: "#f59e0b", opacity: 0.25, type: "outlined" },
      ...overrides,
    },
    tracks: [
      {
        type: "bigwig",
        base: { id: "signal", title: "Signal", display: "full", height: 60, color: "#000000" },
        config: { url: "YOUR_URL_HERE", range: { min: 0, max: 10 } },
        source: "user",
      },
      {
        type: "ruler",
        base: { id: "ruler", title: "Coordinates", display: "full", height: 40, color: "#111111" },
        config: {},
        source: "host",
      },
    ],
    pinnedTrackIds: ["ruler"],
    regionGroups: [
      {
        id: "elements",
        name: "Elements",
        color: "#1a73e8",
        collapsed: true,
        regionIds: ["promoter", "enhancer"],
      },
    ],
  };
}
