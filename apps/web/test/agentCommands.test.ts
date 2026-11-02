import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { commandMessageSchema, type CommandMessage } from "../features/agent/commands/protocol";
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
    /** The next command delivered to this tab. */
    async function next(): Promise<CommandMessage> {
      for (;;) {
        const match = /event: command\ndata: ([^\n]+)\n\n/.exec(buffer);
        if (match) {
          buffer = buffer.slice(match.index + match[0].length);
          return commandMessageSchema.parse(JSON.parse(match[1]));
        }
        const chunk = await reader.read();
        if (chunk.done) throw new Error("The stream ended");
        buffer += chunk.value;
      }
    }
    // The stream is open once its first comment arrives.
    buffer += (await reader.read()).value ?? "";
    return { response, next, close: () => lifetime.abort() };
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

  it("requires a tab ID", async () => {
    const id = session();
    const request = new Request(`http://localhost/api/sessions/${id}/commands`);
    expect((await openCommandStream(request, id, dependencies)).status).toBe(400);
  });
});
