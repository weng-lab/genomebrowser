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
import { createAgentThreads, type AgentThreads } from "../features/agent/server/threads";
import { createCommandRelay, type CommandRelay } from "../features/agent/server/relay";
import { createMcpEndpoint, type McpCaller } from "../features/mcp/server/mcp";
import {
  createMemorySessionBus,
  createRedisSessionBus,
  type SessionBus,
} from "../features/sessions/server/bus";
import { createSessions, type Sessions } from "../features/sessions/server/sessions";
import { createSessionService, type SessionService } from "../features/sessions/server/service";
import { connectDatabase } from "./server/database";
import { createRedisConnection, type RedisConnection } from "./server/redis";

type Services = {
  db: NodePgDatabase;
  sessions: Sessions;
  accountSettings: AccountSettingsStore;
  agentThreads: AgentThreads;
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

/** Agent threads of the signed-in user's sessions. */
export async function getAgentThreads(): Promise<AgentThreads> {
  return (await getServices()).agentThreads;
}

/** The signed-in account, as its browser tabs act for it. */
export async function getTabAccount(): Promise<AgentAccount> {
  const { sessions, accountSettings } = await getServices();
  return { sessions, settings: accountSettings };
}

/** Operations scoped to a verified user ID (Clerk or a scoped Eve credential). */
async function accountForUser(
  userId: string,
): Promise<AgentAccount & { settings: AccountSettingsStore }> {
  const { db } = await getServices();
  const identity: Identity = { userId: async () => userId };
  return {
    sessions: createSessions({ db, identity }),
    settings: createAccountSettings({ db, identity }),
  };
}

/** A verified user's account, for Eve's scoped requests. */
export function getAgentAccountForUser(userId: string) {
  return accountForUser(userId);
}

async function composeServices(): Promise<Services> {
  const db = drizzle({ client: await connectDatabase(process.env) });
  return {
    db,
    sessions: createSessions({ db, identity: clerkIdentity }),
    accountSettings: createAccountSettings({ db, identity: clerkIdentity }),
    agentThreads: createAgentThreads({ db, identity: clerkIdentity }),
  };
}

let redisConnection: RedisConnection | undefined;
let bus: SessionBus | undefined;
let relay: CommandRelay | undefined;

function getSharedRedis(url: string): RedisConnection {
  return (redisConnection ??= createRedisConnection({ url }));
}

/**
 * The process's live session bus. Uses Redis when `REDIS_URL` is configured so
 * multiple serverless instances share live pub/sub; falls back to an in-memory
 * bus when `REDIS_URL` is unset so local dev works without Docker.
 */
export function getSessionBus(): SessionBus {
  return (bus ??= process.env.REDIS_URL
    ? createRedisSessionBus({
        connection: getSharedRedis(process.env.REDIS_URL),
        namespace: agentRedisNamespace(),
      })
    : createMemorySessionBus());
}

/** Authoritative live session service for browser routes (Clerk session cookies). */
export async function getSessionService(): Promise<SessionService> {
  return createSessionService({
    sessions: (await getServices()).sessions,
    bus: getSessionBus(),
  });
}

/** Authoritative live session service for an MCP caller's verified user ID. */
export async function getAgentSessionService(userId: string): Promise<SessionService> {
  return createSessionService({
    sessions: (await accountForUser(userId)).sessions,
    bus: getSessionBus(),
  });
}

/**
 * The process's command relay, sharing the process's Redis connection at `REDIS_URL`.
 * Each Vercel deployment uses its own namespace, so an older preview's agents and
 * tabs never reach a newer one's. It connects on first use.
 */
export function getCommandRelay(): CommandRelay {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL must be set for agent commands");
  return (relay ??= createCommandRelay({
    connection: getSharedRedis(url),
    namespace: agentRedisNamespace(),
  }));
}

/** Close and reset all server pub/sub and relay connections (for graceful shutdown and tests). */
export async function closeServerConnections(): Promise<void> {
  const activeRelay = relay;
  const activeBus = bus;
  const activeRedis = redisConnection;
  relay = undefined;
  bus = undefined;
  redisConnection = undefined;
  await Promise.all([activeRelay?.close(), activeBus?.close()]);
  await activeRedis?.close();
}

async function authenticateMcpRequest(request: Request): Promise<McpCaller | null> {
  const bearer = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  // Only Eve holds session credentials, so they act for the agent panel.
  if (bearer?.startsWith("gbmcp_")) {
    const principal = await readCommandCredential(bearer);
    return principal && { ...principal, agent: "panel" };
  }
  const userId = await clerkAgentIdentity.userId();
  return userId ? { userId, agent: "external" } : null;
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
    sessionService: getAgentSessionService,
  }));
}
