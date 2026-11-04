import { createClient } from "redis";
import { afterEach, describe, expect, it } from "vitest";
import {
  createCommandRelay,
  type CommandRelay,
  type CommandRelayOptions,
} from "../features/agent/server/relay";
import { attachTab, closedPort, stalledServer, testNamespace, testRedisUrl } from "./redis";

// Real Redis. Each test uses its own namespace; relays stand in for server instances.
const relays: CommandRelay[] = [];
function relay(options: Partial<CommandRelayOptions> = {}) {
  const created = createCommandRelay({
    url: testRedisUrl!,
    namespace: testNamespace(),
    commandTimeoutMs: 1_000,
    ...options,
  });
  relays.push(created);
  return created;
}

const session = () => crypto.randomUUID();
const setRegion = {
  name: "set_region",
  params: { region: { chromosome: "chr1", start: 0, end: 10 } },
};
const never = () => new AbortController().signal;

afterEach(async () => {
  await Promise.all(relays.splice(0).map((relay) => relay.close()));
});

describe.skipIf(!testRedisUrl)("command relay", () => {
  it("delivers a command to the attached tab and returns its reply", async () => {
    const commands = relay();
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");

    const result = commands.dispatch(id, setRegion, never());
    const command = await tab.command();
    expect(command).toEqual({
      commandId: expect.any(String),
      ...setRegion,
      expiresAt: expect.any(Number),
    });
    expect(
      await commands.reply(id, { commandId: command.commandId, result: { ok: true, value: 1 } }),
    ).toBe(true);
    expect(await result).toEqual({ ok: true, value: 1 });
    // The reply completed the command; a repeated one finds nothing waiting.
    expect(
      await commands.reply(id, { commandId: command.commandId, result: { ok: true, value: 2 } }),
    ).toBe(false);
  });

  it("delivers between server instances that share a namespace", async () => {
    const namespace = testNamespace();
    const tabServer = relay({ namespace });
    const agentServer = relay({ namespace });
    const id = session();
    const tab = await attachTab(tabServer, id);
    if (tab === "taken") throw new Error("Tab was refused");

    const result = agentServer.dispatch(id, setRegion, never());
    const { commandId } = await tab.command();
    await tabServer.reply(id, { commandId, result: { ok: false, code: "NOPE", error: "No" } });
    expect(await result).toEqual({ ok: false, code: "NOPE", error: "No" });
  });

  it("keeps deployments apart", async () => {
    const id = session();
    const tab = await attachTab(relay(), id);
    expect(tab).not.toBe("taken");
    expect(await relay().dispatch(id, setRegion, never())).toMatchObject({
      ok: false,
      code: "NOT_CONNECTED",
    });
  });

  it("refuses commands past the per-session limit on every instance, until one finishes", async () => {
    const options = {
      namespace: testNamespace(),
      commandTimeoutMs: 5_000,
      maxPendingPerSession: 2,
    };
    const commands = relay(options);
    const other = relay(options);
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    const first = commands.dispatch(id, setRegion, never());
    const second = other.dispatch(id, setRegion, never());
    const firstId = (await tab.command()).commandId;
    const secondId = (await tab.command()).commandId;
    for (const instance of [commands, other])
      expect(await instance.dispatch(id, setRegion, never())).toMatchObject({
        ok: false,
        code: "BUSY",
      });
    // Other sessions have their own limit.
    expect(await commands.dispatch(session(), setRegion, never())).toMatchObject({
      code: "NOT_CONNECTED",
    });

    await commands.reply(id, { commandId: firstId, result: { ok: true, value: 1 } });
    await Promise.race([first, second]);
    // The finished command's place frees once its cleanup reaches Redis.
    let third: Promise<unknown> | undefined;
    await expect
      .poll(async () => {
        const result = other.dispatch(id, setRegion, never());
        const busy = await Promise.race([
          result.then((value) => value.ok === false && value.code === "BUSY"),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 200)),
        ]);
        if (!busy) third = result;
        return busy;
      })
      .toBe(false);
    const thirdId = (await tab.command()).commandId;
    for (const commandId of [secondId, thirdId])
      await commands.reply(id, { commandId, result: { ok: true, value: 2 } });
    expect(await Promise.all([first, second, third])).toEqual([
      { ok: true, value: expect.any(Number) },
      { ok: true, value: expect.any(Number) },
      { ok: true, value: expect.any(Number) },
    ]);
  });

  it("frees the place of a command whose instance stopped, at its deadline", async () => {
    const namespace = testNamespace();
    const commands = relay({ namespace, maxPendingPerSession: 1 });
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    // An instance that stopped mid-command leaves its entry behind, without cleanup.
    const redis = createClient({ url: testRedisUrl });
    await redis.connect();
    await redis.zAdd(`${namespace}:pending:${id}`, {
      score: Date.now() + 300,
      value: crypto.randomUUID(),
    });
    redis.destroy();
    expect(await commands.dispatch(id, setRegion, never())).toMatchObject({ code: "BUSY" });

    await new Promise((resolve) => setTimeout(resolve, 400));
    const result = commands.dispatch(id, setRegion, never());
    const { commandId } = await tab.command();
    await commands.reply(id, { commandId, result: { ok: true, value: 3 } });
    expect(await result).toEqual({ ok: true, value: 3 });
  });

  it("fails at once when no tab is attached", async () => {
    const started = Date.now();
    expect(await relay().dispatch(session(), setRegion, never())).toMatchObject({
      ok: false,
      code: "NOT_CONNECTED",
    });
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("refuses another tab while one holds the session, and accepts it once that tab leaves", async () => {
    const commands = relay();
    const id = session();
    const first = await attachTab(commands, id);
    if (first === "taken") throw new Error("Tab was refused");
    expect(await attachTab(commands, id)).toBe("taken");

    first.close();
    await first.ended;
    await expect.poll(() => attachTab(commands, id)).not.toBe("taken");
  });

  it("lets a tab's reconnect replace its previous connection, whose cleanup cannot release it", async () => {
    const commands = relay();
    const id = session();
    const tabId = crypto.randomUUID();
    const old = await attachTab(commands, id, tabId);
    if (old === "taken") throw new Error("Tab was refused");
    const pending = commands.dispatch(id, setRegion, never());
    await old.command();

    const current = await attachTab(commands, id, tabId);
    if (current === "taken") throw new Error("Reconnect was refused");
    // The replaced stream ends, and the command sent to it fails rather than wait or run again.
    await old.ended;
    expect(await pending).toMatchObject({ ok: false, code: "NOT_CONNECTED" });

    // Its cleanup has run; the session still belongs to the new connection.
    const result = commands.dispatch(id, setRegion, never());
    const { commandId } = await current.command();
    await commands.reply(id, { commandId, result: { ok: true, value: "new" } });
    expect(await result).toEqual({ ok: true, value: "new" });
    expect(await attachTab(commands, id)).toBe("taken");
  });

  it("fails a pending command as soon as its tab disconnects", async () => {
    const commands = relay({ commandTimeoutMs: 5_000 });
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    const started = Date.now();
    const result = commands.dispatch(id, setRegion, never());
    await tab.command();
    tab.close();
    expect(await result).toMatchObject({ ok: false, code: "NOT_CONNECTED" });
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("asks the tab to stop a command its caller cancels", async () => {
    const commands = relay({ commandTimeoutMs: 5_000 });
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    const caller = new AbortController();
    const result = commands.dispatch(id, setRegion, caller.signal);
    const { commandId } = await tab.command();

    caller.abort();
    expect(await result).toMatchObject({ ok: false, code: "CANCELLED" });
    expect(await tab.next()).toEqual({ event: "cancel", commandId });
    // A late reply changes nothing.
    expect(await commands.reply(id, { commandId, result: { ok: true, value: 1 } })).toBe(false);
  });

  it("times out a command the tab does not answer, and asks the tab to stop it", async () => {
    const commands = relay({ commandTimeoutMs: 300 });
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    const result = commands.dispatch(id, setRegion, never());
    const { commandId, expiresAt } = await tab.command();
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 300);
    expect(await result).toMatchObject({ ok: false, code: "TIMEOUT" });
    expect(await tab.next()).toEqual({ event: "cancel", commandId });
  });

  it("ends a tab stream when its lifetime ends, freeing the session for its reconnect", async () => {
    const commands = relay({ streamLifetimeMs: 200 });
    const id = session();
    const tab = await attachTab(commands, id);
    if (tab === "taken") throw new Error("Tab was refused");
    await tab.ended;
    await expect.poll(() => attachTab(commands, id)).not.toBe("taken");
  });

  it("fails within the command timeout when Redis is unreachable", async () => {
    const commands = relay({ url: await closedPort(), commandTimeoutMs: 300 });
    const started = Date.now();
    expect(await commands.dispatch(session(), setRegion, never())).toMatchObject({
      ok: false,
      code: "RELAY_UNAVAILABLE",
    });
    await expect(commands.attach(session(), crypto.randomUUID(), never())).rejects.toThrow(
      "Could not attach the browser tab",
    );
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("fails within the command timeout when Redis stalls, and cancels without waiting for it", async () => {
    const stalled = await stalledServer();
    try {
      const commands = relay({ url: stalled.url, commandTimeoutMs: 300 });
      let started = Date.now();
      expect(await commands.dispatch(session(), setRegion, never())).toMatchObject({
        ok: false,
        code: "RELAY_UNAVAILABLE",
      });
      expect(Date.now() - started).toBeLessThan(1_000);

      const caller = new AbortController();
      started = Date.now();
      const result = commands.dispatch(session(), setRegion, caller.signal);
      caller.abort();
      expect(await result).toMatchObject({ ok: false, code: "CANCELLED" });
      expect(Date.now() - started).toBeLessThan(100);

      started = Date.now();
      await expect(commands.attach(session(), crypto.randomUUID(), never())).rejects.toThrow(
        "Could not attach the browser tab",
      );
      expect(Date.now() - started).toBeLessThan(1_000);
    } finally {
      await stalled.close();
    }
  });
});
