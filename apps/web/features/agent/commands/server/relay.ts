import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { commandResultSchema, type CommandReply, type CommandResult } from "../protocol";

export type CommandRelayOptions = {
  /** Redis server, such as `redis://127.0.0.1:6379`. */
  url: string;
  /** Prefix for every Redis key and channel, so several relays can share one server. */
  prefix?: string;
  /** How long a command waits for the tab's reply. */
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
   * `NOT_CONNECTED`, `TIMEOUT`, or `CANCELLED` rather than rejecting.
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
  close(): Promise<void>;
};

// Take the session for a tab unless another tab holds it.
const hold = `local holder = redis.call("GET", KEYS[1])
if holder == false or holder == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
  return 1
end
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
    disconnected: (sessionId: string) => `${prefix}disconnected:${sessionId}`,
    reply: (sessionId: string, commandId: string) => `${prefix}reply:${sessionId}:${commandId}`,
  };

  // Tab streams still freeing their sessions.
  const endings = new Set<Promise<void>>();
  // One connection publishes and one listens, shared by every call in this process.
  let clients: ReturnType<typeof connectClients> | undefined;
  function connected() {
    return (clients ??= connectClients(options.url).catch((error: unknown) => {
      clients = undefined;
      throw error;
    }));
  }

  async function dispatch(
    sessionId: string,
    command: { name: string; params: unknown },
    signal: AbortSignal,
  ): Promise<CommandResult> {
    if (signal.aborted) return failure("CANCELLED", "The command was cancelled");
    const { publisher, subscriber } = await connected();
    const commandId = randomUUID();
    const expiresAt = Date.now() + timeoutMs;
    const { promise, resolve } = Promise.withResolvers<CommandResult>();
    const onReply = (message: string) => {
      const result = commandResultSchema.safeParse(JSON.parse(message));
      resolve(result.success ? result.data : failure("INVALID_REPLY", "The tab replied invalidly"));
    };
    const onDisconnect = () => resolve(failure("NOT_CONNECTED", "The browser tab disconnected"));
    const onAbort = () => resolve(failure("CANCELLED", "The command was cancelled"));
    const timer = setTimeout(
      () => resolve(failure("TIMEOUT", "The browser tab did not reply in time")),
      timeoutMs,
    );
    signal.addEventListener("abort", onAbort, { once: true });
    const reply = keys.reply(sessionId, commandId);
    // Listen before sending, so an immediate reply cannot be missed.
    await Promise.all([
      subscriber.subscribe(reply, onReply),
      subscriber.subscribe(keys.disconnected(sessionId), onDisconnect),
    ]);
    try {
      const message = JSON.stringify({ ...command, commandId, expiresAt });
      const receivers = await publisher.publish(keys.commands(sessionId), message);
      if (receivers === 0) {
        resolve(
          failure(
            "NOT_CONNECTED",
            "The session is not open in a browser tab with remote control enabled",
          ),
        );
      }
      return await promise;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      await Promise.all([
        subscriber.unsubscribe(reply, onReply),
        subscriber.unsubscribe(keys.disconnected(sessionId), onDisconnect),
      ]);
    }
  }

  async function connect(sessionId: string, tabId: string, signal: AbortSignal) {
    const { publisher, subscriber } = await connected();
    const holder = keys.holder(sessionId);
    const take = async () =>
      (await publisher.eval(hold, { keys: [holder], arguments: [tabId, String(holdMs)] })) === 1;
    if (signal.aborted || !(await take())) return null;

    const encoder = new TextEncoder();
    let finished = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let onCommand: ((message: string) => void) | undefined;
    let onAbort: (() => void) | undefined;
    let ending: Promise<void> | undefined;
    // Stop listening and free the session for other tabs, once. `close` awaits it.
    const finish = () => {
      if (ending) return;
      finished = true;
      ending = (async () => {
        clearInterval(heartbeat);
        if (onAbort) signal.removeEventListener("abort", onAbort);
        if (onCommand) await subscriber.unsubscribe(keys.commands(sessionId), onCommand);
        await publisher.eval(release, { keys: [holder], arguments: [tabId] });
        await publisher.publish(keys.disconnected(sessionId), tabId);
      })()
        .catch((error: unknown) => console.error("Could not end a tab stream", error))
        .finally(() => endings.delete(ending!));
      endings.add(ending);
    };

    return new ReadableStream<Uint8Array<ArrayBuffer>>({
      async start(controller) {
        const write = (text: string) => {
          if (!finished) controller.enqueue(encoder.encode(text));
        };
        const end = () => {
          if (finished) return;
          finish();
          controller.close();
        };
        onCommand = (message) => write(`event: command\ndata: ${message}\n\n`);
        await subscriber.subscribe(keys.commands(sessionId), onCommand);
        onAbort = end;
        signal.addEventListener("abort", end, { once: true });
        heartbeat = setInterval(() => {
          write(": heartbeat\n\n");
          // Another tab took the session after this stream missed its renewals.
          take().then((held) => held || end(), end);
        }, heartbeatMs);
        write(": connected\n\n");
        if (signal.aborted) end();
      },
      cancel() {
        finish();
        return ending;
      },
    });
  }

  async function acknowledge(sessionId: string, reply: CommandReply) {
    const { publisher } = await connected();
    const message = JSON.stringify(reply.result);
    return (await publisher.publish(keys.reply(sessionId, reply.commandId), message)) > 0;
  }

  async function close() {
    // Let ending streams free their sessions first.
    await Promise.allSettled(endings);
    const current = clients;
    clients = undefined;
    if (!current) return;
    const { publisher, subscriber } = await current;
    await Promise.all([publisher.close(), subscriber.close()]);
  }

  return { dispatch, connect, acknowledge, close };
}

async function connectClients(url: string) {
  const publisher = createClient({ url });
  const subscriber = publisher.duplicate();
  for (const client of [publisher, subscriber]) {
    client.on("error", (error: unknown) => console.error("Command relay Redis error", error));
  }
  await Promise.all([publisher.connect(), subscriber.connect()]);
  return { publisher, subscriber };
}

let shared: CommandRelay | undefined;

/** The relay for this process, configured by `REDIS_URL`. Connects on first use. */
export function getCommandRelay(): CommandRelay {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for agent commands");
  return (shared ??= createCommandRelay({ url }));
}
