import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { clerkIdentity } from "../features/account/server/identity";
import {
  createAccountSettings,
  type AccountSettingsStore,
} from "../features/account/server/settings";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { connectDatabase } from "./server/database";

type Services = { sessions: Sessions; accountSettings: AccountSettingsStore };
let services: Promise<Services> | undefined;

/**
 * Account operations composed once per server process from the database
 * configuration. They share one database pool, which lives as long as the
 * process; the Clerk user is resolved for each operation. Nothing is configured
 * until first use, so builds do not need credentials. Concurrent requests share
 * one initialization, and a failed one is retried by the next request.
 */
function getServices(): Promise<Services> {
  return (services ??= composeServices().catch((error: unknown) => {
    services = undefined;
    throw error;
  }));
}

export async function getSessions(): Promise<Sessions> {
  return (await getServices()).sessions;
}

export async function getAccountSettings(): Promise<AccountSettingsStore> {
  return (await getServices()).accountSettings;
}

async function composeServices(): Promise<Services> {
  const db = drizzle({ client: await connectDatabase(process.env) });
  return {
    sessions: createSessions({ db, identity: clerkIdentity }),
    accountSettings: createAccountSettings({ db, identity: clerkIdentity }),
  };
}
