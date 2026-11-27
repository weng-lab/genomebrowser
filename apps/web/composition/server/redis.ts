import "server-only";
import { createClient } from "redis";

function instantiateClient(url: string, timeoutMs: number) {
  return createClient({
    url,
    // Fail fast while disconnected rather than queuing unbounded commands.
    disableOfflineQueue: true,
    socket: { connectTimeout: timeoutMs },
  });
}

export type RedisClient = ReturnType<typeof instantiateClient>;
export type RedisClients = { publisher: RedisClient; subscriber: RedisClient };

/**
 * Shared Redis publisher + subscriber connection pair so `SessionBus` and
 * `CommandRelay` share two TCP connections per serverless process instead of four.
 */
export type RedisConnection = {
  connect(): Promise<RedisClients>;
  /** Subscribe to subscriber disconnect/error events so active SSE streams can close and catch up. */
  onDisconnect(listener: () => void): () => void;
  close(): Promise<void>;
};

export function createRedisConnection({
  url,
  timeoutMs = 5_000,
}: {
  url: string;
  timeoutMs?: number;
}): RedisConnection {
  let connecting: Promise<RedisClients> | undefined;
  let closed = false;
  const disconnectListeners = new Set<() => void>();

  const notifyDisconnect = () => {
    for (const listener of Array.from(disconnectListeners)) {
      try {
        listener();
      } catch (error) {
        console.error("Redis disconnect listener failed", error);
      }
    }
  };

  function makeClient(role: "publisher" | "subscriber") {
    const client = instantiateClient(url, timeoutMs);
    client.on("error", (error: unknown) => {
      console.error(`Redis ${role} error`, error);
      if (role === "subscriber") notifyDisconnect();
    });
    if (role === "subscriber") {
      client.on("end", notifyDisconnect);
    }
    return client;
  }

  function connect(): Promise<RedisClients> {
    // Once closing starts, the clients are being destroyed, so none are handed out.
    if (closed) return Promise.reject(new Error("Redis connection is closed"));
    connecting ??= (async () => {
      const clients = {
        publisher: makeClient("publisher"),
        subscriber: makeClient("subscriber"),
      };
      const all = Object.values(clients);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stalled = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis did not connect in time")), timeoutMs);
      });
      try {
        await Promise.race([Promise.all(all.map((client) => client.connect())), stalled]);
        return clients;
      } catch (error) {
        for (const client of all) if (client.isOpen) client.destroy();
        throw error;
      } finally {
        clearTimeout(timer);
      }
    })().catch((error: unknown) => {
      connecting = undefined;
      throw error;
    });
    return connecting;
  }

  return {
    connect,
    onDisconnect(listener) {
      disconnectListeners.add(listener);
      return () => {
        disconnectListeners.delete(listener);
      };
    },
    async close() {
      closed = true;
      const clients = await connecting?.catch(() => undefined);
      connecting = undefined;
      for (const client of Object.values(clients ?? {})) if (client.isOpen) client.destroy();
    },
  };
}
