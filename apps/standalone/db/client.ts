import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseGlobal = globalThis as typeof globalThis & { sessionDatabase?: PostgresJsDatabase };

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Keep a bounded pool across development reloads. Connections open on the first query.
  return (databaseGlobal.sessionDatabase ??= drizzle(
    postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    }),
  ));
}
