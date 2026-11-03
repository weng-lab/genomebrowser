import { createClient } from "redis";

/** Old previews must never publish commands into a newer deployment's tabs. */
export function agentRedisPrefix(env: NodeJS.ProcessEnv = process.env) {
  return `gb:${env.VERCEL_DEPLOYMENT_ID ?? env.VERCEL_URL ?? env.GB_AGENT_NAMESPACE ?? "local"}:`;
}

/** Bounded, short operations for agent access metadata; no browser or chat state. */
function createAccessClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for agent access");
  return createClient({
    url,
    disableOfflineQueue: true,
    socket: { connectTimeout: 5_000, socketTimeout: 5_000, reconnectStrategy: false },
  });
}

export async function withAgentRedis<T>(
  operation: (redis: ReturnType<typeof createAccessClient>) => Promise<T>,
) {
  const client = createAccessClient();
  client.on("error", (error: unknown) => console.error("Agent access Redis error", error));
  try {
    await client.connect();
    return await operation(client.withCommandOptions({ timeout: 5_000 }));
  } finally {
    if (client.isOpen) client.destroy();
  }
}
