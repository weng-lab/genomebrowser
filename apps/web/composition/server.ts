import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { clerkAgentIdentity, clerkIdentity } from "../features/account/server/identity";
import {
  createAccountSettings,
  type AccountSettingsStore,
} from "../features/account/server/settings";
import type { AgentAccount } from "../features/agent/server/access";
import { createCommandRelay, type CommandRelay } from "../features/agent/server/relay";
import { createMcpEndpoint } from "../features/mcp/server/mcp";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { connectDatabase } from "./server/database";

type Services = {
  sessions: Sessions;
  accountSettings: AccountSettingsStore;
  /** The same operations for the user an agent request acts for. */
  agent: AgentAccount;
};
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

/** The signed-in account, as its browser tabs act for it. */
export async function getTabAccount(): Promise<AgentAccount> {
  const { sessions, accountSettings } = await getServices();
  return { sessions, settings: accountSettings };
}

async function composeServices(): Promise<Services> {
  const db = drizzle({ client: await connectDatabase(process.env) });
  return {
    sessions: createSessions({ db, identity: clerkIdentity }),
    accountSettings: createAccountSettings({ db, identity: clerkIdentity }),
    agent: {
      sessions: createSessions({ db, identity: clerkAgentIdentity }),
      settings: createAccountSettings({ db, identity: clerkAgentIdentity }),
    },
  };
}

let relay: CommandRelay | undefined;

/**
 * The process's command relay, through the Redis at `REDIS_URL`. Each Vercel
 * deployment uses its own namespace, so an older preview's agents and tabs never
 * reach a newer one's. It connects on first use.
 */
export function getCommandRelay(): CommandRelay {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL must be set for agent commands");
  return (relay ??= createCommandRelay({
    url,
    namespace: `gb:${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}`,
  }));
}

let mcp: ReturnType<typeof createMcpEndpoint> | undefined;

/** The MCP endpoint. Requests act for the Clerk user of their session or OAuth token. */
export function getMcpEndpoint() {
  return (mcp ??= createMcpEndpoint({
    authenticate: async () => (await clerkAgentIdentity.userId()) !== null,
    account: async () => (await getServices()).agent,
    relay: getCommandRelay,
  }));
}
