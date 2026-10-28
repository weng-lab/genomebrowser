import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { createIdentity, identityMode } from "../features/account/server/identity";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { connectDatabase } from "./server/database";

let sessions: Promise<Sessions> | undefined;

/**
 * Session operations composed once per server process from the database
 * configuration and `GB_IDENTITY`. The database pool lives as long as the
 * process; identity is resolved for each operation. Nothing is configured
 * until first use, so builds do not need credentials. Concurrent requests
 * share one initialization, and a failed one is retried by the next request.
 */
export function getSessions(): Promise<Sessions> {
  return (sessions ??= composeSessions().catch((error: unknown) => {
    sessions = undefined;
    throw error;
  }));
}

async function composeSessions(): Promise<Sessions> {
  const mode = identityMode(process.env);
  const pool = await connectDatabase(process.env);
  return createSessions({ db: drizzle({ client: pool }), identity: createIdentity(mode) });
}
