import { createClient } from "redis";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

const timeoutMs = 5_000;

function createAccessClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for agent access");
  return createClient({
    url,
    disableOfflineQueue: true,
    socket: { connectTimeout: timeoutMs, socketTimeout: timeoutMs, reconnectStrategy: false },
  });
}

/**
 * Run one bounded Redis operation for agent access metadata, on one connection
 * whose commands must all finish within `timeoutMs`; holds no chat or browser state.
 */
export async function withAgentRedis<T>(
  operation: (redis: ReturnType<typeof createAccessClient>) => Promise<T>,
  { timeoutMs: limit = timeoutMs }: { timeoutMs?: number } = {},
): Promise<T> {
  const client = createAccessClient();
  client.on("error", (error: unknown) => console.error("Agent access Redis error", error));
  try {
    await client.connect();
    return await operation(client.withCommandOptions({ abortSignal: AbortSignal.timeout(limit) }));
  } finally {
    if (client.isOpen) client.destroy();
  }
}
