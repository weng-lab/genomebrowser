import { createServer, type Server, type Socket } from "node:net";
import type { CommandMessage } from "../features/agent/commands/protocol";
import type { CommandRelay } from "../features/agent/server/relay";

/** Redis server for the relay tests. They are skipped without it, except in CI. */
export const testRedisUrl = process.env.GB_TEST_REDIS_URL;
if (process.env.CI && !testRedisUrl) throw new Error("CI must set GB_TEST_REDIS_URL");

/** A namespace no other test or run shares. */
export const testNamespace = () => `gb-test:${crypto.randomUUID()}`;

type Event = { event: "command"; command: CommandMessage } | { event: "cancel"; commandId: string };

/**
 * Attach a tab through `relay` the way the browser does, reading its SSE stream.
 * `"taken"` when another tab holds the session.
 */
export async function attachTab(
  relay: CommandRelay,
  sessionId: string,
  tabId = crypto.randomUUID(),
) {
  const controller = new AbortController();
  const stream = await relay.attach(sessionId, tabId, controller.signal);
  if (stream === "taken") return "taken" as const;
  return { tabId, ...readCommandStream(stream, () => controller.abort()) };
}

/**
 * Read a tab's SSE command stream. `next` waits for the next command or
 * cancellation; `ended` resolves when the stream closes; `close` closes it as
 * the browser does when it navigates away.
 */
export function readCommandStream(stream: ReadableStream<Uint8Array>, close: () => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: Event[] = [];
  const waiting: ((event: Event) => void)[] = [];
  let buffer = "";
  const ended = (async () => {
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) return;
      buffer += decoder.decode(value);
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, end).split("\n");
        buffer = buffer.slice(end + 2);
        const name = frame.find((line) => line.startsWith("event: "))?.slice(7);
        const data = frame.find((line) => line.startsWith("data: "))?.slice(6);
        if (!name || !data) continue;
        const parsed = JSON.parse(data);
        const event: Event =
          name === "command"
            ? { event: "command", command: parsed }
            : { event: "cancel", commandId: parsed.commandId };
        const waiter = waiting.shift();
        if (waiter) waiter(event);
        else events.push(event);
      }
    }
  })();
  const next = () =>
    new Promise<Event>((resolve) => {
      const event = events.shift();
      if (event) resolve(event);
      else waiting.push(resolve);
    });
  return {
    next,
    async command() {
      const event = await next();
      if (event.event !== "command") throw new Error(`Expected a command, got ${event.event}`);
      return event.command;
    },
    close,
    ended,
  };
}

/** A TCP server that accepts connections and never answers, like a stalled Redis. */
export async function stalledServer() {
  const sockets = new Set<Socket>();
  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return {
    url: `redis://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

/** A local port nothing listens on. */
export async function closedPort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `redis://127.0.0.1:${port}`;
}
