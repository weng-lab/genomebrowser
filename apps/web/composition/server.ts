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

let redisConnection: RedisConnection | undefined;
let redisConnectionUrl: string | undefined;

function getSharedRedis(url: string): RedisConnection {
  if (redisConnection && redisConnectionUrl === url) return redisConnection;
  if (redisConnection) {
    redisConnection
      .close()
      .catch((error: unknown) => console.error("Could not close previous Redis connection", error));
  }
  redisConnectionUrl = url;
  redisConnection = createRedisConnection({ url });
  return redisConnection;
}

/** Close the shared Redis connection, if any (for graceful shutdown and tests). */
export async function closeRedisConnection(): Promise<void> {
  const active = redisConnection;
  redisConnection = undefined;
  redisConnectionUrl = undefined;
  await active?.close();
}

let bus: SessionBus | undefined;
let busUrl: string | undefined;

/**
 * The process's live session bus. Uses Redis when `REDIS_URL` is configured so
 * multiple serverless instances share live pub/sub; falls back to an in-memory
 * bus when `REDIS_URL` is unset so local dev works without Docker.
 */
export function getSessionBus(): SessionBus {
  const url = process.env.REDIS_URL;
  if (bus && busUrl === url) return bus;
  if (bus) {
    bus
      .close()
      .catch((error: unknown) => console.error("Could not close previous session bus", error));
  }
  busUrl = url;
  bus = url
    ? createRedisSessionBus({
        connection: getSharedRedis(url),
        namespace: `gb:${process.env.VERCEL_DEPLOYMENT_ID ?? "local"}`,
      })
    : createMemorySessionBus();
  return bus;
}

/** Authoritative live session service for browser routes (Clerk session cookies). */
export async function getSessionService(): Promise<SessionService> {
  return createSessionService({
    sessions: (await getServices()).sessions,
    bus: getSessionBus(),
  });
}

/** Authoritative live session service for MCP requests (Clerk session or OAuth token). */
export async function getAgentSessionService(): Promise<SessionService> {
  return createSessionService({
    sessions: (await getServices()).agent.sessions,
    bus: getSessionBus(),
  });
}

let relay: CommandRelay | undefined;

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
    sessionService: getAgentSessionService,
  }));
}
