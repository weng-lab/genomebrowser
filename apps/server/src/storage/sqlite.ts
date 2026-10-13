import { DatabaseSync } from "node:sqlite";
import { sessionSnapshotSchema } from "../protocol.ts";
import type { SessionRepository } from "./sessionRepository.ts";

export function createSqliteSessionRepository(path: string): SessionRepository & { close(): void } {
  const database = new DatabaseSync(path);
  database.exec(
    "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)",
  );
  const read = database.prepare("SELECT snapshot FROM sessions WHERE id = ?");
  const write = database.prepare(
    "INSERT INTO sessions (id, snapshot) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot",
  );
  return {
    async load(id) {
      const row = read.get(id);
      return row ? sessionSnapshotSchema.parse(JSON.parse(String(row.snapshot))) : null;
    },
    async save(id, snapshot) {
      write.run(id, JSON.stringify(sessionSnapshotSchema.parse(snapshot)));
    },
    close() {
      database.close();
    },
  };
}
