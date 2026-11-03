import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { createIdentity, identityMode } from "../features/account/server/identity";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { connectDatabase } from "./server/database";
import { createAccountSettings } from "../features/account/server/settings";

let services: ReturnType<typeof composeServices> | undefined;

/**
 * Session operations composed once per server process from the database
 * configuration and `GB_IDENTITY`. The database pool lives as long as the
 * process; identity is resolved for each operation. Nothing is configured
 * until first use, so builds do not need credentials. Concurrent requests
 * share one initialization, and a failed one is retried by the next request.
 */
function getServices() {
  return (services ??= composeServices().catch((error: unknown) => {
    services = undefined;
    throw error;
  }));
}

export async function getSessions(): Promise<Sessions> {
  return (await getServices()).sessions;
}

export async function getAccountSettings() {
  return (await getServices()).accountSettings;
}

/** Account operations for an already verified MCP caller; identity never comes from tool input. */
export async function getMcpAccount(userId: string) {
  const { db } = await getServices();
  const identity = { userId: async () => userId };
  return {
    sessions: createSessions({ db, identity }),
    settings: createAccountSettings(db, identity),
  };
}

async function composeServices() {
  const mode = identityMode(process.env);
  const pool = await connectDatabase(process.env);
  const db = drizzle({ client: pool });
  const identity = createIdentity(mode);
  return {
    db,
    sessions: createSessions({ db, identity }),
    accountSettings: createAccountSettings(db, identity),
  };
}
