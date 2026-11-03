import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { commandResultSchema, type CommandReply, type CommandResult } from "../protocol";

export type CommandRelayOptions = {
  /** Redis server, such as `redis://127.0.0.1:6379`. */
  url: string;
  /** Prefix for every Redis key and channel, so several relays can share one server. */
  prefix?: string;
  /** Deadline for command delivery and replies, and for Redis setup/cleanup. */
  commandTimeoutMs?: number;
  /** How often an open tab stream is kept alive. */
  heartbeatIntervalMs?: number;
};

/**
 * Delivers commands from agent tools to the browser tab connected for a
 * session, and the tab's replies back, through Redis. Tools and tab streams
 * may run in different processes. Only the first tab to connect a session
 * receives its commands. Nothing is stored: a command no tab receives fails,
 * and commands are never replayed.
 */
export type CommandRelay = {
  /**
   * Run a command in the session's tab and wait for its result. Fails with
   * `NOT_CONNECTED`, `TIMEOUT`, `CANCELLED`, or `RELAY_FAILED` rather than
   * rejecting. The timeout covers reaching Redis. When `signal` aborts after
   * delivery, cancellation is sent to the tab if Redis is reachable. A command
   * already applied stays applied.
   */
  dispatch(
    sessionId: string,
    command: { name: string; params: unknown },
    signal: AbortSignal,
  ): Promise<CommandResult>;
  /**
   * An SSE stream of commands for tab `tabId`, open until `signal` aborts or
   * the stream is cancelled. Null while another tab holds the session. The same
   * tab may reconnect at once.
   */
  connect(
    sessionId: string,
    tabId: string,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array<ArrayBuffer>> | null>;
  /** Deliver a tab's reply. False when no dispatch is waiting for it. */
  acknowledge(sessionId: string, reply: CommandReply): Promise<boolean>;
  /** End active operations and streams, then close this relay permanently. */
  close(): Promise<void>;
};

// A holder is `tabId/connectionId`, so a stream frees or renews only its own hold.
// Take the session for a connection unless another tab holds it. The same tab
// may take it over from its previous connection.
const hold = `local holder = redis.call("GET", KEYS[1])
if holder == false or string.find(holder, ARGV[1] .. "/", 1, true) == 1 then
  redis.call("SET", KEYS[1], ARGV[1] .. "/" .. ARGV[2], "PX", ARGV[3])
  return 1
end
return 0`;
const renew = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("PEXPIRE", KEYS[1], ARGV[2]) end
return 0`;
const release = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0`;

function failure(code: string, error: string): CommandResult {
  return { ok: false, code, error };
}

export function createCommandRelay(options: CommandRelayOptions): CommandRelay {
  const prefix = options.prefix ?? "gb:";
  const timeoutMs = options.commandTimeoutMs ?? 5_000;
  const heartbeatMs = options.heartbeatIntervalMs ?? 15_000;
  // A tab stream that ends without cleanup, such as a stopped function, frees its session after this.
  const holdMs = heartbeatMs * 3;
  const keys = {
    holder: (sessionId: string) => `${prefix}tab:${sessionId}`,
    commands: (sessionId: string) => `${prefix}commands:${sessionId}`,
    cancelled: (sessionId: string) => `${prefix}cancelled:${sessionId}`,
    disconnected: (sessionId: string) => `${prefix}disconnected:${sessionId}`,
    reply: (sessionId: string, commandId: string) => `${prefix}reply:${sessionId}:${commandId}`,
  };

  // The publisher is shared; each operation owns and destroys its subscriber.
  const subscribers = new Set<ReturnType<typeof createRedisClient>>();
  const stops = new Set<() => void>();
  const endings = new Set<Promise<void>>();
  let publisher: ReturnType<typeof createRedisClient> | undefined;
  let ready: Promise<ReturnType<typeof createRedisClient>> | undefined;
  let closed = false;

  function createRedisClient() {
    const result = createClient({ url: options.url, disableOfflineQueue: true });
    result.on("error", (error: unknown) => console.error("Command relay Redis error", error));
    return result;
  }

  async function connected(signal?: AbortSignal): Promise<ReturnType<typeof createRedisClient>> {
    if (closed) return Promise.reject(new Error("The command relay is closed"));
    if (!ready) {
      publisher = createRedisClient();
      const current = publisher;
      ready = current.connect().then(() => current);
    }
    if (!signal) return ready;
    signal.throwIfAborted();
    const { promise, reject } = Promise.withResolvers<never>();
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    try {
      return await Promise.race([ready, promise]);
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }

  function createSubscriber() {
    if (closed) throw new Error("The command relay is closed");
    const subscriber = createRedisClient();
    subscribers.add(subscriber);
    return subscriber;
  }

  function destroy(subscriber: ReturnType<typeof createRedisClient>) {
    subscribers.delete(subscriber);
    if (subscriber.isOpen) subscriber.destroy();
  }

  async function dispatch(
    sessionId: string,
    command: { name: string; params: unknown },
    signal: AbortSignal,
  ): Promise<CommandResult> {
    if (signal.aborted) return failure("CANCELLED", "The command was cancelled");
    if (closed) return failure("RELAY_FAILED", "The command relay is closed");
    const commandId = randomUUID();
    const expiresAt = Date.now() + timeoutMs;
    const subscriber = createSubscriber();
    const delivery = new AbortController();
    const { promise, resolve } = Promise.withResolvers<CommandResult>();
    let settled = false;
    let sent = false;

    // Completion owns cleanup. It never waits for a Redis acknowledgement.
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      stops.delete(onClose);
      delivery.abort();
      destroy(subscriber);
      if (sent && !result.ok && (result.code === "CANCELLED" || result.code === "TIMEOUT")) {
        // Cancellation is cooperative: an already-applied change stays applied.
        cancel().catch((error: unknown) => {
          if (!closed) console.error("Could not cancel an agent command", error);
        });
      }
      resolve(result);
    };
    const onAbort = () => finish(failure("CANCELLED", "The command was cancelled"));
    const onClose = () => finish(failure("RELAY_FAILED", "The command relay is closed"));
    const timer = setTimeout(
      () => finish(failure("TIMEOUT", "The browser tab did not reply in time")),
      timeoutMs,
    );
    signal.addEventListener("abort", onAbort, { once: true });
    stops.add(onClose);

    async function cancel() {
      const current = await connected();
      await current
        .withCommandOptions({ timeout: timeoutMs })
        .publish(keys.cancelled(sessionId), JSON.stringify({ commandId }));
    }

    async function deliver() {
      const [current] = await Promise.all([connected(delivery.signal), subscriber.connect()]);
      if (settled) return;
      await Promise.all([
        subscriber.subscribe(keys.reply(sessionId, commandId), (message) => {
          try {
            const result = commandResultSchema.safeParse(JSON.parse(message));
            finish(
              result.success ? result.data : failure("INVALID_REPLY", "The tab replied invalidly"),
            );
          } catch {
            finish(failure("INVALID_REPLY", "The tab replied invalidly"));
          }
        }),
        subscriber.subscribe(keys.disconnected(sessionId), () =>
          finish(failure("NOT_CONNECTED", "The browser tab disconnected")),
        ),
      ]);
      if (settled) return;
      sent = true;
      const receivers = await current
        .withCommandOptions({
          abortSignal: delivery.signal,
        })
        .publish(keys.commands(sessionId), JSON.stringify({ ...command, commandId, expiresAt }));
      if (receivers === 0)
        finish(
          failure(
            "NOT_CONNECTED",
            "The session is not open in a browser tab with remote control enabled",
          ),
        );
    }

    deliver().catch((error: unknown) => {
      if (settled) return;
      console.error("Could not deliver an agent command", error);
      finish(failure("RELAY_FAILED", "The command could not reach the browser tab"));
    });
    return promise;
  }

  async function connect(sessionId: string, tabId: string, signal: AbortSignal) {
    if (signal.aborted || closed) return null;
    const subscriber = createSubscriber();
    const lifetime = new AbortController();
    const holder = keys.holder(sessionId);
    const connectionId = randomUUID();
    const owner = `${tabId}/${connectionId}`;
    let publisher: Awaited<ReturnType<typeof connected>> | undefined;
    let held = false;
    let finished = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let controller: ReadableStreamDefaultController<Uint8Array<ArrayBuffer>> | undefined;

    // The stream owns both its subscription and lease, including failed setup.
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(setupTimer);
      clearInterval(heartbeat);
      signal.removeEventListener("abort", finish);
      stops.delete(finish);
      lifetime.abort();
      destroy(subscriber);
      controller?.close();
      if (!held || !publisher) return;
      const current = publisher.withCommandOptions({ timeout: timeoutMs });
      const ending = (async () => {
        // An older stream cannot release its replacement's lease.
        const released = await current.eval(release, { keys: [holder], arguments: [owner] });
        if (released === 1) await current.publish(keys.disconnected(sessionId), tabId);
      })()
        .catch((error: unknown) => console.error("Could not end a tab stream", error))
        .finally(() => endings.delete(ending));
      endings.add(ending);
    };
    const setupTimer = setTimeout(finish, timeoutMs);
    signal.addEventListener("abort", finish, { once: true });
    stops.add(finish);

    try {
      [publisher] = await Promise.all([connected(lifetime.signal), subscriber.connect()]);
      if (finished) return null;
      held =
        (await publisher
          .withCommandOptions({
            abortSignal: lifetime.signal,
            timeout: timeoutMs,
          })
          .eval(hold, { keys: [holder], arguments: [tabId, connectionId, String(holdMs)] })) === 1;
      if (!held || finished) {
        finish();
        return null;
      }
      const encoder = new TextEncoder();
      return new ReadableStream<Uint8Array<ArrayBuffer>>({
        async start(streamController) {
          controller = streamController;
          const write = (text: string) => {
            if (!finished) controller!.enqueue(encoder.encode(text));
          };
          try {
            await Promise.all([
              subscriber.subscribe(keys.commands(sessionId), (message) =>
                write(`event: command\ndata: ${message}\n\n`),
              ),
              subscriber.subscribe(keys.cancelled(sessionId), (message) =>
                write(`event: cancel\ndata: ${message}\n\n`),
              ),
            ]);
            if (finished) return;
            clearTimeout(setupTimer);
            // A missed renewal ends this connection rather than retaining stale ownership.
            heartbeat = setInterval(() => {
              write(": heartbeat\n\n");
              publisher!
                .withCommandOptions({ timeout: heartbeatMs })
                .eval(renew, {
                  keys: [holder],
                  arguments: [owner, String(holdMs)],
                })
                .then((held) => {
                  if (held !== 1) finish();
                }, finish);
            }, heartbeatMs);
            write(": connected\n\n");
          } catch (error) {
            finish();
            if (!signal.aborted) throw error;
          }
        },
        cancel() {
          // A cancelled stream has already closed its controller.
          controller = undefined;
          finish();
        },
      });
    } catch (error) {
      finish();
      if (signal.aborted) return null;
      throw error;
    }
  }

  async function acknowledge(sessionId: string, reply: CommandReply) {
    const signal = AbortSignal.timeout(timeoutMs);
    const publisher = await connected(signal);
    return (
      (await publisher
        .withCommandOptions({ abortSignal: signal, timeout: timeoutMs })
        .publish(keys.reply(sessionId, reply.commandId), JSON.stringify(reply.result))) > 0
    );
  }

  async function close() {
    closed = true;
    for (const stop of stops) stop();
    for (const subscriber of subscribers) destroy(subscriber);
    // Graceful close drains Redis's queue and can wait forever on a broken socket.
    await Promise.allSettled(endings);
    if (publisher?.isOpen) publisher.destroy();
  }

  return { dispatch, connect, acknowledge, close };
}

let shared: CommandRelay | undefined;

/** The relay for this process, configured by `REDIS_URL`. Connects on first use. */
export function getCommandRelay(): CommandRelay {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for agent commands");
  return (shared ??= createCommandRelay({ url }));
}
