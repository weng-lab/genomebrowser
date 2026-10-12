import { DatabaseSync } from "node:sqlite";
import { sessionSnapshotSchema } from "../protocol.ts";
import type { SessionRepository } from "./sessionRepository.ts";

export function createSqliteSessionRepository(path: string): SessionRepository & { close(): void } {
  const database = new DatabaseSync(path);
  database.exec(
    "CREATE TABLE IF NOT EXISTS session (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot TEXT NOT NULL)",
  );
  const read = database.prepare("SELECT snapshot FROM session WHERE id = 1");
  const write = database.prepare(
    "INSERT INTO session (id, snapshot) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot",
  );
  return {
    async load() {
      const row = read.get();
      return row ? sessionSnapshotSchema.parse(JSON.parse(String(row.snapshot))) : null;
    },
    async save(snapshot) {
      write.run(JSON.stringify(sessionSnapshotSchema.parse(snapshot)));
    },
    close() {
      database.close();
    },
  };
}
