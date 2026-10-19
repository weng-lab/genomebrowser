import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createIdentity, identityMode } from "../features/account/server/identity";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";

let sessions: Sessions | undefined;

/**
 * Session operations composed once per server process from `DATABASE_URL` and
 * `GB_IDENTITY`. The database pool lives as long as the process; identity is
 * resolved for each operation. Nothing is configured until first use, so
 * builds do not need credentials.
 */
export function getSessions(): Sessions {
  if (sessions) return sessions;
  const mode = identityMode(process.env);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for saved sessions");
  const pool = new Pool({ connectionString: url });
  // The pool discards idle connections that the database closes. Unhandled, the error would end the process.
  pool.on("error", (error) => console.error("Idle PostgreSQL connection failed", error));
  sessions = createSessions({ db: drizzle({ client: pool }), identity: createIdentity(mode) });
  return sessions;
}
