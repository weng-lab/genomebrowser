import { randomUUID } from "node:crypto";
import { createServer, connect as connectSocket, type Socket } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  commandCancelSchema,
  commandMessageSchema,
  type CommandMessage,
} from "../features/agent/commands/protocol";
import { openCommandStream, receiveCommandReply } from "../features/agent/commands/server/http";
import { createCommandRelay, type CommandRelay } from "../features/agent/commands/server/relay";
import { SessionError, type Sessions } from "../features/sessions/server/sessions";
import { testRedisUrl as redisUrl } from "./redis";

// The agent's tools and the tab's route run in different processes, so each
// side gets its own relay. Redis, both relays, and the route helpers are real;
// session ownership is the injected boundary.
describe.skipIf(!redisUrl)("agent commands", () => {
  const prefix = `gb-test-${randomUUID()}:`;
  const owned = new Set<string>();
  const sessions = {
    async authorize(id: string) {
      if (!owned.has(id)) throw new SessionError("NOT_FOUND", "Session not found");
    },
  } as Sessions;
  let agent: CommandRelay;
  let web: CommandRelay;
  let dependencies: { getSessions: () => Promise<Sessions>; relay: CommandRelay };
  const tabs: AbortController[] = [];

  beforeAll(() => {
    const options = { url: redisUrl!, prefix, commandTimeoutMs: 1_000, heartbeatIntervalMs: 200 };
    agent = createCommandRelay(options);
    web = createCommandRelay(options);
    dependencies = { getSessions: async () => sessions, relay: web };
  });

  afterEach(() => {
    for (const tab of tabs.splice(0)) tab.abort();
  });

  afterAll(async () => {
    await Promise.all([agent.close(), web.close()]);
  });

  function session() {
    const id = randomUUID();
    owned.add(id);
    return id;
  }

  async function connect(sessionId: string, tabId = randomUUID()) {
    const lifetime = new AbortController();
    tabs.push(lifetime);
    const request = new Request(
      `http://localhost/api/sessions/${sessionId}/commands?tab=${tabId}`,
      {
        signal: lifetime.signal,
      },
    );
    const response = await openCommandStream(request, sessionId, dependencies);
    if (!response.ok) return { response };
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    /** The next event delivered to this tab, skipping comments. */
    async function event(): Promise<{ type: string; data: unknown }> {
      for (;;) {
        const match = /event: (\w+)\ndata: ([^\n]+)\n\n/.exec(buffer);
        if (match) {
          buffer = buffer.slice(match.index + match[0].length);
          return { type: match[1], data: JSON.parse(match[2]) };
        }
        const chunk = await reader.read();
        if (chunk.done) throw new Error("The stream ended");
        buffer += chunk.value;
      }
    }
    /** The next command delivered to this tab. */
    async function next(): Promise<CommandMessage> {
      const { type, data } = await event();
      expect(type).toBe("command");
      return commandMessageSchema.parse(data);
    }
    // The stream is open once its first comment arrives.
    buffer += (await reader.read()).value ?? "";
    return { response, event, next, close: () => lifetime.abort() };
  }

  function reply(sessionId: string, body: unknown) {
    const request = new Request(`http://localhost/api/sessions/${sessionId}/commands`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return receiveCommandReply(request, sessionId, dependencies);
  }

  const setRegion = {
    name: "set_region",
    params: { region: { chromosome: "chr1", start: 1, end: 2 } },
  };

  it("runs a command in the session's tab and returns the tab's result", async () => {
    const id = session();
    const tab = await connect(id);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    const command = await tab.next!();
    expect(command).toMatchObject(setRegion);
    expect(command.expiresAt).toBeGreaterThan(Date.now());
    const result = { ok: true, value: { clamped: false } };
    expect((await reply(id, { commandId: command.commandId, result })).status).toBe(200);
    expect(await pending).toEqual(result);
  });

  it("returns the tab's rejection", async () => {
    const id = session();
    const tab = await connect(id);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    const { commandId } = await tab.next!();
    const result = { ok: false, code: "UNKNOWN_CHROMOSOME", error: "No chr99" };
    await reply(id, { commandId, result });
    expect(await pending).toEqual(result);
  });

  it("keeps another dispatch subscribed when a concurrent dispatch finishes", async () => {
    const id = session();
    const tab = await connect(id);
    const first = agent.dispatch(id, setRegion, new AbortController().signal);
    const second = agent.dispatch(id, setRegion, new AbortController().signal);
    const commands = [await tab.next!(), await tab.next!()];
    for (const { commandId } of commands) {
      await reply(id, { commandId, result: { ok: true, value: {} } });
    }
    expect(await first).toMatchObject({ ok: true });
    expect(await second).toMatchObject({ ok: true });

    const completing = agent.dispatch(id, setRegion, new AbortController().signal);
    const a = await tab.next!();
    const remaining = agent.dispatch(id, setRegion, new AbortController().signal);
    await tab.next!();
    await reply(id, { commandId: a.commandId, result: { ok: true, value: {} } });
    await completing;
    tab.close!();
    expect(await remaining).toMatchObject({ code: "NOT_CONNECTED" });
  });

  it("delivers immediately across overlapping reconnects", async () => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const id = session();
      const tabId = randomUUID();
      const first = await connect(id, tabId);
      // Alternate cleanup during subscription and cleanup after the replacement is ready.
      if (attempt % 2 === 0) first.close!();
      const second = await connect(id, tabId);
      if (attempt % 2 !== 0) first.close!();
      const pending = agent.dispatch(id, setRegion, new AbortController().signal);
      const { commandId } = await second.next!();
      await reply(id, { commandId, result: { ok: true, value: attempt } });
      expect(await pending).toEqual({ ok: true, value: attempt });
      second.close!();
    }
  });

  it("fails clearly when the session has no open tab", async () => {
    expect(await agent.dispatch(session(), setRegion, new AbortController().signal)).toMatchObject({
      ok: false,
      code: "NOT_CONNECTED",
    });
  });

  it("lets only the session's owner connect", async () => {
    const { response } = await connect(randomUUID());
    expect(response.status).toBe(404);
  });

  it("keeps the session for the first tab, rejects others, and lets the first reconnect", async () => {
    const id = session();
    const tabId = randomUUID();
    const first = await connect(id, tabId);
    expect((await connect(id)).response.status).toBe(409);
    first.close!();
    const again = await connect(id, tabId);
    expect(again.response.status).toBe(200);
  });

  it("keeps the session for a tab's new connection when its old one ends later", async () => {
    const id = session();
    const tabId = randomUUID();
    const first = await connect(id, tabId);
    const second = await connect(id, tabId);
    expect(second.response.status).toBe(200);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    const { commandId } = await second.next!();
    first.close!();
    // Let the old connection free what it holds.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect((await connect(id)).response.status).toBe(409);
    const result = { ok: true, value: {} };
    await reply(id, { commandId, result });
    expect(await pending).toEqual(result);
  });

  it("frees the session for another tab once the first disconnects", async () => {
    const id = session();
    const first = await connect(id);
    first.close!();
    await expect.poll(async () => (await connect(id)).response.status).toBe(200);
  });

  it("times out without keeping the command for a later tab", async () => {
    const id = session();
    const tab = await connect(id);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    const { commandId } = await tab.next!();
    expect(await pending).toMatchObject({ ok: false, code: "TIMEOUT" });
    expect((await reply(id, { commandId, result: { ok: true, value: {} } })).status).toBe(409);
  });

  it("fails pending commands when their tab disconnects", async () => {
    const id = session();
    const tab = await connect(id);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    await tab.next!();
    tab.close!();
    expect(await pending).toMatchObject({ ok: false, code: "NOT_CONNECTED" });
  });

  it("cancels a command, and a late reply then finds nothing pending", async () => {
    const id = session();
    const tab = await connect(id);
    const cancel = new AbortController();
    const pending = agent.dispatch(id, setRegion, cancel.signal);
    const { commandId } = await tab.next!();
    cancel.abort();
    expect(await pending).toMatchObject({ ok: false, code: "CANCELLED" });
    expect((await reply(id, { commandId, result: { ok: true, value: {} } })).status).toBe(409);
  });

  it("tells the tab to stop a cancelled command", async () => {
    const id = session();
    const tab = await connect(id);
    const cancel = new AbortController();
    const pending = agent.dispatch(id, setRegion, cancel.signal);
    const { commandId } = await tab.next!();
    cancel.abort();
    const { type, data } = await tab.event!();
    expect(type).toBe("cancel");
    expect(commandCancelSchema.parse(data)).toEqual({ commandId });
    expect(await pending).toMatchObject({ ok: false, code: "CANCELLED" });
  });

  it("never delivers a command cancelled while reaching Redis", async () => {
    const id = session();
    const tab = await connect(id);
    // A new relay has not connected yet.
    const fresh = createCommandRelay({ url: redisUrl!, prefix, commandTimeoutMs: 1_000 });
    try {
      const cancel = new AbortController();
      const pending = fresh.dispatch(id, setRegion, cancel.signal);
      cancel.abort();
      expect(await pending).toMatchObject({ ok: false, code: "CANCELLED" });
      // The tab's next command is a later one.
      const later = agent.dispatch(id, setRegion, new AbortController().signal);
      const { commandId } = await tab.next!();
      const result = { ok: true, value: {} };
      await reply(id, { commandId, result });
      expect(await later).toEqual(result);
    } finally {
      await fresh.close();
    }
  });

  it("rejects replies for another session and malformed replies", async () => {
    const id = session();
    const other = session();
    const tab = await connect(id);
    const pending = agent.dispatch(id, setRegion, new AbortController().signal);
    const { commandId } = await tab.next!();
    const result = { ok: true, value: {} };
    expect((await reply(other, { commandId, result })).status).toBe(409);
    expect((await reply(id, { commandId, result: { ok: "yes" } })).status).toBe(400);
    expect((await reply(id, "{")).status).toBe(400);
    expect(
      (await reply(id, { commandId, result: { ok: true, value: "x".repeat(1_100_000) } })).status,
    ).toBe(413);
    expect((await reply(randomUUID(), { commandId, result })).status).toBe(404);
    await reply(id, { commandId, result });
    expect(await pending).toEqual(result);
  });

  it("closes pending commands without disturbing another relay", async () => {
    const id = session();
    const tab = await connect(id);
    const isolated = createCommandRelay({ url: redisUrl!, prefix });
    const pending = isolated.dispatch(id, setRegion, new AbortController().signal);
    const command = await tab.next!();
    await isolated.close();
    expect(await pending).toMatchObject({ ok: false, code: "RELAY_FAILED" });
    expect(
      (await reply(id, { commandId: command.commandId, result: { ok: true, value: {} } })).status,
    ).toBe(409);
    expect(await isolated.dispatch(id, setRegion, new AbortController().signal)).toMatchObject({
      code: "RELAY_FAILED",
    });
  });

  it("closes active streams and releases their leases", async () => {
    const id = session();
    const isolated = createCommandRelay({ url: redisUrl!, prefix });
    const stream = await isolated.connect(id, randomUUID(), new AbortController().signal);
    const reader = stream!.getReader();
    await reader.read();
    await isolated.close();
    expect((await reader.read()).done).toBe(true);
    const replacement = await connect(id);
    expect(replacement.response.status).toBe(200);
  });

  it.each(["timeout", "abort"])(
    "settles %s even when Redis stops acknowledging publications",
    async (ending) => {
      const id = session();
      const tab = await connect(id);
      const sockets = new Set<Socket>();
      const destination = new URL(redisUrl!);
      // A real TCP fault at the agent boundary: Redis receives PUBLISH and the
      // tab receives the command, but the agent never gets its PUBLISH reply.
      const proxy = createServer((downstream) => {
        const upstream = connectSocket(Number(destination.port || 6379), destination.hostname);
        sockets.add(downstream);
        sockets.add(upstream);
        let blocked = false;
        let requests = "";
        downstream.on("data", (data) => {
          requests += data.toString();
          if (requests.includes(`${prefix}commands:${id}`)) blocked = true;
          upstream.write(data);
        });
        upstream.on("data", (data) => {
          if (!blocked) downstream.write(data);
        });
        downstream.on("error", () => upstream.destroy());
        upstream.on("error", () => downstream.destroy());
        downstream.on("close", () => upstream.destroy());
        upstream.on("close", () => downstream.destroy());
      });
      await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
      const address = proxy.address();
      if (!address || typeof address === "string") throw new Error("Missing proxy address");
      const url = new URL(redisUrl!);
      url.hostname = "127.0.0.1";
      url.port = String(address.port);
      const isolated = createCommandRelay({ url: url.href, prefix, commandTimeoutMs: 300 });
      const lifetime = new AbortController();
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      try {
        const pending = isolated.dispatch(id, setRegion, lifetime.signal);
        const command = await tab.next!();
        if (ending === "abort") lifetime.abort();
        const result = await Promise.race([
          pending,
          new Promise((resolve) => {
            watchdog = setTimeout(() => resolve("hung"), 1_000);
          }),
        ]);
        expect(result).toMatchObject({
          ok: false,
          code: ending === "abort" ? "CANCELLED" : "TIMEOUT",
        });
        expect(await tab.event!()).toEqual({
          type: "cancel",
          data: { commandId: command.commandId },
        });
        expect(
          (await reply(id, { commandId: command.commandId, result: { ok: true, value: {} } }))
            .status,
        ).toBe(409);
      } finally {
        clearTimeout(watchdog);
        await isolated.close();
        for (const socket of sockets) socket.destroy();
        await new Promise<void>((resolve, reject) =>
          proxy.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );

  it("stops reading and cancels an oversized chunked reply", async () => {
    let cancelled = false;
    let chunks = 0;
    const request = new Request("http://localhost/api/sessions/reply", {
      method: "POST",
      body: new ReadableStream(
        {
          pull(controller) {
            if (++chunks > 2) throw new Error("Read past the reply size limit");
            controller.enqueue(new Uint8Array(600_000));
          },
          cancel() {
            cancelled = true;
          },
        },
        { highWaterMark: 0 },
      ),
      duplex: "half",
    } as RequestInit);
    const response = await receiveCommandReply(request, session(), dependencies);
    expect(response.status).toBe(413);
    expect(cancelled).toBe(true);
  });

  it("requires a tab ID", async () => {
    const id = session();
    const request = new Request(`http://localhost/api/sessions/${id}/commands`);
    expect((await openCommandStream(request, id, dependencies)).status).toBe(400);
  });
});

// Needs no Redis: nothing listens at this address.
it("times out while Redis is unreachable", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const unreachable = createCommandRelay({
    url: "redis://127.0.0.1:1",
    commandTimeoutMs: 200,
  });
  try {
    const pending = unreachable.dispatch(
      randomUUID(),
      { name: "set_region", params: {} },
      new AbortController().signal,
    );
    expect(await pending).toMatchObject({ ok: false, code: "TIMEOUT" });
  } finally {
    await unreachable.close();
    vi.restoreAllMocks();
  }
});

it("bounds reply delivery and aborted tab setup while Redis is unreachable", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const unreachable = createCommandRelay({ url: "redis://127.0.0.1:1", commandTimeoutMs: 100 });
  try {
    const lifetime = new AbortController();
    const pending = unreachable.connect(randomUUID(), randomUUID(), lifetime.signal);
    lifetime.abort();
    expect(await pending).toBeNull();
    await expect(
      unreachable.acknowledge(randomUUID(), {
        commandId: randomUUID(),
        result: { ok: true, value: {} },
      }),
    ).rejects.toThrow("The operation was aborted due to timeout");
  } finally {
    await unreachable.close();
    vi.restoreAllMocks();
  }
});
