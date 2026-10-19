/**
 * Copy sessions saved by the old browser server's SQLite database into PostgreSQL,
 * owned by one explicitly named user. Each copy gets a new UUID and keeps the old
 * session ID as its name. The SQLite file is opened read-only and left unchanged.
 * A session already copied for that owner, with the same name and snapshot, is
 * skipped, so the import can be repeated.
 *
 *   pnpm web sessions:import-sqlite --sqlite ../server/data/browser.sqlite --owner user_123
 *
 * Add `--session <id>` once per session to copy only those. Runs with Node's
 * type stripping and reads `DATABASE_URL` from `.env.local` when present.
 */
import { DatabaseSync } from "node:sqlite";
import { parseArgs } from "node:util";
import { sessionSnapshotSchema } from "../sessions/snapshot.ts";
import { and, eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sessionsTable } from "../server/sessions/table.ts";

export async function importSqliteSessions({
  db,
  sqlitePath,
  owner,
  sessionIds,
}: {
  db: NodePgDatabase;
  sqlitePath: string;
  owner: string;
  /** Old session IDs to copy. All of them when omitted. */
  sessionIds?: readonly string[];
}) {
  if (!owner.trim()) throw new Error("An owner is required");
  const selected = sessionIds && new Set(sessionIds);
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  let rows: { id: string; snapshot: string }[];
  try {
    rows = sqlite
      .prepare("SELECT id, snapshot FROM sessions ORDER BY id")
      .all()
      .map((row) => ({ id: String(row.id), snapshot: String(row.snapshot) }))
      .filter(({ id }) => !selected || selected.has(id));
  } finally {
    sqlite.close();
  }
  const found = new Set(rows.map(({ id }) => id));
  const missing = sessionIds?.filter((id) => !found.has(id)) ?? [];
  if (missing.length > 0) throw new Error(`Not in the SQLite file: ${missing.join(", ")}`);

  const result = { imported: [] as string[], skipped: [] as string[], invalid: [] as string[] };
  await db.transaction(async (tx) => {
    for (const row of rows) {
      let snapshot;
      try {
        snapshot = sessionSnapshotSchema.parse(JSON.parse(row.snapshot));
      } catch {
        result.invalid.push(row.id);
        continue;
      }
      const [existing] = await tx
        .select({ id: sessionsTable.id })
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.owner, owner),
            eq(sessionsTable.name, row.id),
            sql`${sessionsTable.snapshot} = ${JSON.stringify(snapshot)}::jsonb`,
          ),
        );
      if (existing) {
        result.skipped.push(row.id);
        continue;
      }
      await tx.insert(sessionsTable).values({ owner, name: row.id, snapshot });
      result.imported.push(row.id);
    }
  });
  return result;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      sqlite: { type: "string" },
      owner: { type: "string" },
      session: { type: "string", multiple: true },
    },
  });
  if (!values.sqlite || !values.owner) {
    console.error("Usage: --sqlite <path> --owner <user ID> [--session <id>]...");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await importSqliteSessions({
      db: drizzle({ client: pool }),
      sqlitePath: values.sqlite,
      owner: values.owner,
      sessionIds: values.session,
    });
    console.log(`Imported for ${values.owner}: ${result.imported.join(", ") || "none"}`);
    if (result.skipped.length > 0) console.log(`Already imported: ${result.skipped.join(", ")}`);
    if (result.invalid.length > 0)
      console.warn(`Not imported, invalid snapshot: ${result.invalid.join(", ")}`);
  } finally {
    await pool.end();
  }
}
