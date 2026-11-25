import { createClient } from "redis";

// Imported by both Next.js and Eve's Nitro runtime, so this file cannot import `server-only`.

const timeoutMs = 5_000;

function createAccessClient(url: string) {
  return createClient({
    url,
    disableOfflineQueue: true,
    // Each operation bounds its own commands, so an idle connection may stay open.
    socket: { connectTimeout: timeoutMs, reconnectStrategy: false },
  });
}

type AccessClient = ReturnType<typeof createAccessClient>;

/** The process's connection for agent access metadata, reused by every operation. */
let shared: { url: string; client: AccessClient; ready: Promise<AccessClient> } | undefined;

/**
 * The shared connection to `REDIS_URL`, connecting it on first use. It never
 * reconnects on its own: once it closes or fails, the next operation opens another.
 */
function accessClient(): Promise<AccessClient> {
  const url = process.env.REDIS_URL;
  if (!url) return Promise.reject(new Error("REDIS_URL is required for agent access"));
  if (shared && (shared.url !== url || !shared.client.isOpen)) {
    if (shared.client.isOpen) shared.client.destroy();
    shared = undefined;
  }
  if (shared) return shared.ready;
  const client = createAccessClient(url);
  // An idle connection does not keep the process running.
  client.unref();
  const drop = () => {
    if (shared?.client === client) shared = undefined;
  };
  client.on("error", (error: unknown) => {
    console.error("Agent access Redis error", error);
    drop();
  });
  client.on("end", drop);
  const ready = client.connect().then(
    () => client,
    (error: unknown) => {
      drop();
      if (client.isOpen) client.destroy();
      throw error;
    },
  );
  shared = { url, client, ready };
  return ready;
}

/**
 * Run one bounded Redis operation for agent access metadata, on the process's
 * shared connection, whose commands must all finish within `timeoutMs` and
 * stop when `signal` aborts; holds no chat or browser state.
 */
export async function withAgentRedis<T>(
  operation: (redis: AccessClient) => Promise<T>,
  { timeoutMs: limit = timeoutMs, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(limit);
  const client = await accessClient();
  try {
    return await operation(
      client.withCommandOptions({
        abortSignal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      }),
    );
  } catch (error) {
    // A connection that stopped answering, such as one cut while the process
    // was suspended, is not used again.
    if (timeout.aborted && shared?.client === client) {
      shared = undefined;
      if (client.isOpen) client.destroy();
    }
    throw error;
  }
}
