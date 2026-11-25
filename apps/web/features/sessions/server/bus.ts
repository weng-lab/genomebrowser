import "server-only";
import { sessionEventSchema, type SessionEvent } from "../syncSchema";

type BusRedisPublisher = {
  withCommandOptions(options: { abortSignal: AbortSignal }): {
    publish(channel: string, message: string): Promise<unknown>;
  };
};
type BusRedisSubscriber = {
  subscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
  unsubscribe(channel: string, listener: (message: string) => void): Promise<unknown>;
};

export type RedisClientPair = { publisher: BusRedisPublisher; subscriber: BusRedisSubscriber };

/** Shared Redis connection injected by composition so bus and relay share sockets. */
export type SharedRedisConnection = {
  connect(): Promise<RedisClientPair>;
  onDisconnect(listener: () => void): () => void;
};

/**
 * Injectable pub/sub bus for live session events. Production uses Redis so every
 * serverless instance fans out revision hints and deletion notices; local dev
 * (without `REDIS_URL`) and tests use `createMemorySessionBus` with zero external services.
 */
export type SessionBus = {
  /** Broadcast a lightweight session event (revision hint or deletion) to subscribed streams. */
  publish(id: string, event: SessionEvent): Promise<void>;
  /**
   * Listen for events on `id` until `signal` aborts. Resolves once the
   * subscription is active so callers can check catch-up state without races.
   * `onDisconnect` fires if the underlying pub/sub connection drops.
   */
  subscribe(
    id: string,
    onEvent: (event: SessionEvent) => void,
    signal: AbortSignal,
    onDisconnect?: () => void,
  ): Promise<void>;
  /** Disconnect and release any held resources. */
  close(): Promise<void>;
};

/**
 * In-memory `SessionBus` for unit tests and zero-Docker local development.
 * Multiple web clients connected to the same Next.js process sync live through it.
 */
export function createMemorySessionBus(): SessionBus {
  const subscribers = new Map<string, Set<(event: SessionEvent) => void>>();

  return {
    async publish(id, event) {
      const listeners = subscribers.get(id);
      if (!listeners) return;
      for (const listener of Array.from(listeners)) {
        try {
          listener(event);
        } catch (error) {
          console.error("SessionBus subscriber error", error);
        }
      }
    },
    async subscribe(id, onEvent, signal) {
      if (signal.aborted) return;
      let listeners = subscribers.get(id);
      if (!listeners) {
        listeners = new Set();
        subscribers.set(id, listeners);
      }
      listeners.add(onEvent);
      signal.addEventListener(
        "abort",
        () => {
          listeners.delete(onEvent);
          if (listeners.size === 0) subscribers.delete(id);
        },
        { once: true },
      );
    },
    async close() {
      subscribers.clear();
    },
  };
}

export type RedisSessionBusOptions = {
  /** Shared Redis connection pair managed by the caller. */
  connection: SharedRedisConnection;
  /** Prefix for every Redis channel so deployments stay isolated. */
  namespace: string;
  /** Timeout for individual Redis publish commands. Defaults to 5 seconds. */
  timeoutMs?: number;
};

/**
 * Redis-backed pub/sub `SessionBus`. Shares one subscriber connection per server
 * instance and notifies active SSE streams if the subscriber drops so clients
 * reconnect and catch up from PostgreSQL.
 */
export function createRedisSessionBus(options: RedisSessionBusOptions): SessionBus {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const eventChannel = (id: string) => `${options.namespace}:session-events:${id}`;

  let closed = false;
  const cleanups = new Set<Promise<unknown>>();

  function connect(): Promise<RedisClientPair> {
    if (closed) return Promise.reject(new Error("The session bus is closed"));
    return options.connection.connect();
  }

  function background(operation: (clients: RedisClientPair) => Promise<unknown>, what: string) {
    const task = options.connection
      .connect()
      .then(operation)
      .catch((error: unknown) => console.error(`Session bus could not ${what}`, error))
      .finally(() => cleanups.delete(task));
    cleanups.add(task);
  }

  return {
    async publish(id, event) {
      try {
        const { publisher } = await connect();
        await publisher
          .withCommandOptions({ abortSignal: AbortSignal.timeout(timeoutMs) })
          .publish(eventChannel(id), JSON.stringify(event));
      } catch (error) {
        console.error("Session bus publish failed", error);
      }
    },

    async subscribe(id, onEvent, signal, onConnectionDrop) {
      if (signal.aborted) return;
      const { subscriber } = await connect();
      const channel = eventChannel(id);
      const listener = (message: string) => {
        const parsed = sessionEventSchema.safeParse(parseJson(message));
        if (parsed.success) onEvent(parsed.data);
      };
      const stopDisconnect = onConnectionDrop
        ? options.connection.onDisconnect(onConnectionDrop)
        : undefined;
      try {
        await subscriber.subscribe(channel, listener);
      } catch (error) {
        stopDisconnect?.();
        throw error;
      }
      if (signal.aborted) {
        stopDisconnect?.();
        background(({ subscriber }) => subscriber.unsubscribe(channel, listener), "unsubscribe");
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          stopDisconnect?.();
          background(({ subscriber }) => subscriber.unsubscribe(channel, listener), "unsubscribe");
        },
        { once: true },
      );
    },

    async close() {
      closed = true;
      while (cleanups.size > 0) await Promise.allSettled(cleanups);
    },
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
