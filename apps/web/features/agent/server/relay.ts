import "server-only";
import { randomUUID } from "node:crypto";
import { Deferred, Effect, Exit, Scope } from "effect";
import { createClient } from "redis";
import {
  commandResultSchema,
  type CommandMessage,
  type CommandReply,
  type CommandResult,
} from "../commands/protocol";

export type CommandRelayOptions = {
  /** Redis server, such as `redis://127.0.0.1:6379`. */
  url: string;
  /** Prefix for every Redis key and channel. Deployments that must not reach each other's tabs use different ones. */
  namespace: string;
  /** Bounds a whole dispatch, from reaching Redis to the tab's reply, and every other Redis wait. */
  commandTimeoutMs?: number;
  /** Commands one server instance may have in flight for one session; more fail with `BUSY`. */
  maxPendingPerSession?: number;
  /** How often an open tab stream is kept alive and its hold on the session renewed. */
  heartbeatIntervalMs?: number;
  /** How long one tab stream stays open before ending, so it closes cleanly before the platform stops it. */
  streamLifetimeMs?: number;
};

/**
 * Delivers agent commands to the browser tab attached to a session, and its
 * replies back, through Redis, so tools and tab streams may run in different
 * server instances. One tab holds a session at a time; another tab is refused
 * until it lets go, while the holding tab's own reconnect replaces its previous
 * connection. Nothing is queued or replayed: a command no tab receives fails.
 */
export type CommandRelay = {
  /**
   * Run a command in the session's tab and wait for its result. Never rejects;
   * fails with `NOT_CONNECTED`, `TIMEOUT`, `CANCELLED`, `BUSY`,
   * `RELAY_UNAVAILABLE`, or the tab's own failure. The command timeout bounds the whole call. When
   * `signal` aborts or time runs out after delivery, the tab is asked to stop
   * the command without waiting for Redis; a change already applied stays.
   */
  dispatch(
    sessionId: string,
    command: Pick<CommandMessage, "name" | "params">,
    signal: AbortSignal,
  ): Promise<CommandResult>;
  /**
   * An SSE stream of commands, and cancellations of them, for one connection of
   * tab `tabId`, open until `signal` aborts, the stream is cancelled, or its
   * lifetime ends. `"taken"` while another tab holds the session. Rejects when
   * Redis is unavailable.
   */
  attach(
    sessionId: string,
    tabId: string,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array> | "taken">;
  /** Hand a tab's reply to the dispatch waiting for it. False when none is. Rejects when Redis is unavailable. */
  reply(sessionId: string, reply: CommandReply): Promise<boolean>;
  /** End every stream and dispatch, finish connection cleanup, and disconnect from Redis. */
  close(): Promise<void>;
};

// A session's lease names the connection that receives its commands, as
// `tabId/connectionId`. Each script reads and changes it atomically, so a
// stale connection can neither receive commands nor release its replacement.

// Take the lease unless another tab holds it. Replacing this tab's previous
// connection ends that stream and fails the commands sent to it.
const holdScript = `local current = redis.call("GET", KEYS[1])
if current and string.sub(current, 1, string.len(ARGV[1]) + 1) ~= ARGV[1] .. "/" then return 0 end
redis.call("SET", KEYS[1], ARGV[2], "PX", ARGV[3])
if current and current ~= ARGV[2] then
  redis.call("PUBLISH", ARGV[4] .. current, "end")
  redis.call("PUBLISH", KEYS[2], current)
end
return 1`;
const renewScript = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("PEXPIRE", KEYS[1], ARGV[2]) end
return 0`;
const releaseScript = `if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1])
redis.call("PUBLISH", KEYS[2], ARGV[1])
return 1`;
// Returns the connection that received the command, or nil.
const publishScript = `local owner = redis.call("GET", KEYS[1])
if not owner then return false end
if redis.call("PUBLISH", ARGV[1] .. owner, ARGV[2]) == 0 then return false end
return owner`;

const failure = (code: string, error: string): CommandResult => ({ ok: false, code, error });
const notOpen = () =>
  failure("NOT_CONNECTED", "The session is not open in a browser tab with remote control enabled");
const disconnected = () => failure("NOT_CONNECTED", "The browser tab disconnected");

/** Succeeds with `value` once `signal` aborts. */
function aborted<A>(signal: AbortSignal, value: A) {
  return Effect.callback<A>((resume) => {
    const stop = () => resume(Effect.succeed(value));
    if (signal.aborted) return stop();
    signal.addEventListener("abort", stop, { once: true });
    return Effect.sync(() => signal.removeEventListener("abort", stop));
  });
}

export function createCommandRelay(options: CommandRelayOptions): CommandRelay {
  const timeoutMs = options.commandTimeoutMs ?? 5_000;
  const maxPending = options.maxPendingPerSession ?? 32;
  // Commands in flight from this instance, by session.
  const pending = new Map<string, number>();
  const heartbeatMs = options.heartbeatIntervalMs ?? 15_000;
  const lifetimeMs = options.streamLifetimeMs ?? 240_000;
  // A connection that ends without cleanup, as when its function is stopped, frees the session after this.
  const leaseMs = heartbeatMs * 3;
  const prefix = `${options.namespace}:`;
  const key = {
    lease: (sessionId: string) => `${prefix}lease:${sessionId}`,
    disconnected: (sessionId: string) => `${prefix}disconnected:${sessionId}`,
    connection: (sessionId: string, owner: string) => `${prefix}connection:${sessionId}:${owner}`,
    reply: (sessionId: string, commandId: string) => `${prefix}reply:${sessionId}:${commandId}`,
  };

  type Redis = ReturnType<typeof createRedis>;
  type Clients = { publisher: Redis; subscriber: Redis };
  let connecting: Promise<Clients> | undefined;
  let closed = false;
  // Each stream's `end`, and when its cleanup has started.
  const streams = new Map<() => void, Promise<void>>();
  const dispatches = new Map<AbortController, Promise<CommandResult>>();
  const cleanups = new Set<Promise<unknown>>();

  function createRedis() {
    const client = createClient({
      url: options.url,
      // Commands fail at once while disconnected rather than waiting to reconnect.
      disableOfflineQueue: true,
      socket: { connectTimeout: timeoutMs },
    });
    client.on("error", (error: unknown) => console.error("Command relay Redis error", error));
    return client;
  }

  /** The shared publisher and subscriber. A connection attempt that fails or stalls is discarded, and the next use retries. */
  function connect(): Promise<Clients> {
    // While closing, cleanup still uses the existing connection.
    if (closed && !connecting) return Promise.reject(new Error("The command relay is closed"));
    connecting ??= (async () => {
      const clients = { publisher: createRedis(), subscriber: createRedis() };
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

  /** A Redis operation that stops waiting when interrupted. */
  const redis = <A>(operation: (clients: Clients, signal: AbortSignal) => Promise<A>) =>
    Effect.tryPromise(async (signal) => operation(await connect(), signal));

  /** Run cleanup without making anyone wait for Redis; `close` waits for it. */
  function background(operation: (clients: Clients) => Promise<unknown>, what: string) {
    if (closed && !connecting) return;
    const cleanup = connect()
      .then(operation)
      .catch((error: unknown) => console.error(`Could not ${what}`, error))
      .finally(() => cleanups.delete(cleanup));
    cleanups.add(cleanup);
  }

  const timed = (signal: AbortSignal) => AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);

  /** Listen on `channel` until the enclosing scope closes. */
  const subscribe = (channel: string, listener: (message: string) => void) =>
    Effect.gen(function* () {
      yield* Effect.addFinalizer(() =>
        Effect.sync(() =>
          background(({ subscriber }) => subscriber.unsubscribe(channel, listener), "unsubscribe"),
        ),
      );
      yield* redis(({ subscriber }) => subscriber.subscribe(channel, listener));
    });

  function dispatch(
    sessionId: string,
    command: Pick<CommandMessage, "name" | "params">,
    signal: AbortSignal,
  ): Promise<CommandResult> {
    if (closed) return Promise.resolve(failure("RELAY_UNAVAILABLE", "The command relay is closed"));
    // Each dispatch holds Redis subscriptions until it finishes, so bound them.
    const inFlight = pending.get(sessionId) ?? 0;
    if (inFlight >= maxPending)
      return Promise.resolve(failure("BUSY", "Too many commands are pending for this session"));
    pending.set(sessionId, inFlight + 1);
    const commandId = randomUUID();
    const expiresAt = Date.now() + timeoutMs;
    let delivered = false;

    const run = Effect.gen(function* () {
      const outcome = yield* Deferred.make<CommandResult>();
      const finish = (result: CommandResult) => Deferred.doneUnsafe(outcome, Exit.succeed(result));
      let target: string | undefined;
      const gone = new Set<string>();

      // Listen before publishing, so an immediate reply or disconnect is not missed.
      yield* subscribe(key.reply(sessionId, commandId), (message) => {
        const result = commandResultSchema.safeParse(parseJson(message));
        finish(
          result.success ? result.data : failure("INVALID_REPLY", "The tab replied invalidly"),
        );
      });
      yield* subscribe(key.disconnected(sessionId), (owner) => {
        if (owner === target) finish(disconnected());
        else gone.add(owner);
      });
      const message: CommandMessage = { commandId, ...command, expiresAt };
      const deliver = Effect.gen(function* () {
        const owner = yield* redis(({ publisher }, signal) =>
          publisher.withCommandOptions({ abortSignal: signal }).eval(publishScript, {
            keys: [key.lease(sessionId)],
            arguments: [
              key.connection(sessionId, ""),
              `event: command\ndata: ${JSON.stringify(message)}\n\n`,
            ],
          }),
        );
        if (typeof owner !== "string") return notOpen();
        delivered = true;
        if (gone.has(owner)) return disconnected();
        target = owner;
        return yield* Deferred.await(outcome);
      });
      // Once published, the tab may be running the command, even before Redis
      // confirms it. Stopping early asks the session's tab to stop; that tab's
      // own reconnects keep the command, and any other tab ignores it.
      return yield* deliver.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() =>
            background(
              ({ publisher }) =>
                publisher
                  .withCommandOptions({ abortSignal: AbortSignal.timeout(timeoutMs) })
                  .eval(publishScript, {
                    keys: [key.lease(sessionId)],
                    arguments: [
                      key.connection(sessionId, ""),
                      `event: cancel\ndata: ${JSON.stringify({ commandId })}\n\n`,
                    ],
                  }),
              "cancel an agent command",
            ),
          ),
        ),
      );
    });

    const stop = new AbortController();
    const bounded = Effect.scoped(run).pipe(
      Effect.timeoutOrElse({
        duration: timeoutMs,
        orElse: () =>
          Effect.succeed(
            delivered
              ? failure("TIMEOUT", "The browser tab did not reply in time")
              : failure("RELAY_UNAVAILABLE", "The command relay did not respond in time"),
          ),
      }),
      Effect.catch((error) => {
        console.error("Could not deliver an agent command", error);
        return Effect.succeed(
          failure("RELAY_UNAVAILABLE", "The command could not reach the browser tab"),
        );
      }),
    );
    const result = Effect.runPromise(
      Effect.raceAll([
        bounded,
        aborted(signal, failure("CANCELLED", "The command was cancelled")),
        aborted(stop.signal, failure("RELAY_UNAVAILABLE", "The command relay is closed")),
      ]),
    ).finally(() => {
      dispatches.delete(stop);
      const remaining = (pending.get(sessionId) ?? 1) - 1;
      if (remaining > 0) pending.set(sessionId, remaining);
      else pending.delete(sessionId);
    });
    dispatches.set(stop, result);
    return result;
  }

  async function attach(
    sessionId: string,
    tabId: string,
    signal: AbortSignal,
  ): Promise<ReadableStream<Uint8Array> | "taken"> {
    if (closed) throw new Error("The command relay is closed");
    const owner = `${tabId}/${randomUUID()}`;
    const scope = Scope.makeUnsafe();
    const ended = Deferred.makeUnsafe<void>();
    const end = () => Deferred.doneUnsafe(ended, Exit.void);
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const write = (text: string) => {
      try {
        controller?.enqueue(encoder.encode(text));
      } catch {
        end();
      }
    };
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
      cancel() {
        controller = undefined;
        end();
      },
    });

    const open = Effect.gen(function* () {
      // Receive before holding, so no command published to this connection is missed.
      yield* subscribe(key.connection(sessionId, owner), (message) => {
        if (message === "end") end();
        else write(message);
      });
      // Only this connection's own lease is released.
      yield* Effect.addFinalizer(() =>
        Effect.sync(() =>
          background(
            ({ publisher }) =>
              publisher
                .withCommandOptions({ abortSignal: AbortSignal.timeout(timeoutMs) })
                .eval(releaseScript, {
                  keys: [key.lease(sessionId), key.disconnected(sessionId)],
                  arguments: [owner],
                }),
            "release a tab connection",
          ),
        ),
      );
      const held = yield* redis(({ publisher }, signal) =>
        publisher.withCommandOptions({ abortSignal: signal }).eval(holdScript, {
          keys: [key.lease(sessionId), key.disconnected(sessionId)],
          arguments: [tabId, owner, String(leaseMs), key.connection(sessionId, "")],
        }),
      );
      return held === 1;
    });

    const opened = await Effect.runPromiseExit(
      open.pipe(Effect.timeout(timeoutMs), Scope.provide(scope)),
      { signal: timed(signal) },
    );
    if (!Exit.isSuccess(opened) || !opened.value) {
      await Effect.runPromise(Scope.close(scope, Exit.void));
      if (Exit.isSuccess(opened)) return "taken";
      throw new Error("Could not attach the browser tab", { cause: opened.cause });
    }

    // A missed renewal ends the connection rather than keep a hold it may have lost.
    const heartbeat = Effect.forever(
      Effect.gen(function* () {
        yield* Effect.sleep(heartbeatMs);
        write(": heartbeat\n\n");
        const renewed = yield* redis(({ publisher }, signal) =>
          publisher.withCommandOptions({ abortSignal: signal }).eval(renewScript, {
            keys: [key.lease(sessionId)],
            arguments: [owner, String(leaseMs)],
          }),
        ).pipe(
          Effect.timeoutOrElse({ duration: heartbeatMs, orElse: () => Effect.succeed(0) }),
          Effect.orElseSucceed(() => 0),
        );
        if (renewed !== 1) end();
      }),
    );
    write(": connected\n\n");
    const done = Effect.runPromise(
      Effect.gen(function* () {
        yield* Effect.forkScoped(heartbeat);
        yield* Effect.raceAll([
          Deferred.await(ended),
          Effect.sleep(lifetimeMs),
          aborted(signal, undefined),
        ]);
      }).pipe(
        Scope.provide(scope),
        Effect.ensuring(
          Effect.sync(() => {
            try {
              controller?.close();
            } catch {
              // The stream was already cancelled.
            }
          }),
        ),
        Effect.ensuring(Scope.close(scope, Exit.void)),
      ),
    ).finally(() => streams.delete(end));
    streams.set(end, done);
    return stream;
  }

  async function reply(sessionId: string, { commandId, result }: CommandReply) {
    const { publisher } = await connect();
    const signal = AbortSignal.timeout(timeoutMs);
    const receivers = await publisher
      .withCommandOptions({ abortSignal: signal })
      .publish(key.reply(sessionId, commandId), JSON.stringify(result));
    return receivers > 0;
  }

  async function close() {
    closed = true;
    for (const stop of dispatches.keys()) stop.abort();
    for (const end of streams.keys()) end();
    await Promise.allSettled([...dispatches.values(), ...streams.values()]);
    // Let connection cleanup reach Redis before disconnecting.
    while (cleanups.size) await Promise.allSettled(cleanups);
    const clients = await connecting?.catch(() => undefined);
    connecting = undefined;
    for (const client of Object.values(clients ?? {})) if (client.isOpen) client.destroy();
  }

  return { dispatch, attach, reply, close };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
