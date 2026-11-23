import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  clerkAgentIdentity,
  clerkIdentity,
  type Identity,
} from "../features/account/server/identity";
import {
  createAccountSettings,
  type AccountSettingsStore,
} from "../features/account/server/settings";
import type { AgentAccount } from "../features/agent/server/access";
import { readCommandCredential } from "../features/agent/server/credential";
import { agentRedisNamespace } from "../features/agent/server/deployment";
import { createCommandRelay, type CommandRelay } from "../features/agent/server/relay";
import { createMcpEndpoint, type McpCaller } from "../features/mcp/server/mcp";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { connectDatabase } from "./server/database";

type Services = {
  db: NodePgDatabase;
  sessions: Sessions;
  accountSettings: AccountSettingsStore;
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

/** Operations scoped to a verified user ID (Clerk or a scoped Eve credential). */
async function accountForUser(userId: string): Promise<AgentAccount> {
  const { db } = await getServices();
  const identity: Identity = { userId: async () => userId };
  return {
    sessions: createSessions({ db, identity }),
    settings: createAccountSettings({ db, identity }),
  };
}

async function composeServices(): Promise<Services> {
  const db = drizzle({ client: await connectDatabase(process.env) });
  return {
    db,
    sessions: createSessions({ db, identity: clerkIdentity }),
    accountSettings: createAccountSettings({ db, identity: clerkIdentity }),
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
    namespace: agentRedisNamespace(),
  }));
}

async function authenticateMcpRequest(request: Request): Promise<McpCaller | null> {
  const bearer = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (bearer?.startsWith("gbmcp_")) return readCommandCredential(bearer);
  const userId = await clerkAgentIdentity.userId();
  return userId ? { userId } : null;
}

let mcp: ReturnType<typeof createMcpEndpoint> | undefined;

/**
 * The MCP endpoint. Requests act for either a verified Clerk user (session or
 * OAuth token) or a short-lived session-scoped credential issued for Eve.
 */
export function getMcpEndpoint() {
  return (mcp ??= createMcpEndpoint({
    authenticate: authenticateMcpRequest,
    account: accountForUser,
    relay: getCommandRelay,
  }));
}
