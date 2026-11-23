// @vitest-environment jsdom

import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { act, StrictMode } from "react";
import { Client } from "eve/client";
import { renderWithProbe, type Probe } from "@weng-lab/render-probe";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { runCommand, type CommandApp } from "../features/agent/commands";
import { AgentChat } from "../features/agent/components/AgentChat";
import { agentRedisNamespace } from "../features/agent/server/deployment";
import { createCommandRelay } from "../features/agent/server/relay";
import { createStores } from "../features/assemblies/assemblies";
import { startAgentAuthorizationServer } from "./agentAuthorizationServer";
import { attachTab, testRedisUrl } from "./redis";
import { testServerUrl } from "./sessionFixtures";

const available = Boolean(testServerUrl && testRedisUrl);
const proxyOrigin = "https://browser.test:8443";
let sessionId = "e376d6ef-36c9-4d01-ad52-9847bad99f3c";
let authorization: Awaited<ReturnType<typeof startAgentAuthorizationServer>> | undefined;
const children: ChildProcess[] = [];
const nativeFetch = globalThis.fetch;
let directory: string | undefined;
let eve = "";
let logs = "";
let probe: Probe | undefined;
const lifetime = new AbortController();
const stores = createStores("hg38")!;

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolveClose) => {
    server.close(() => resolveClose());
  });
  return address.port;
}

function start(args: string[], cwd: string, env: Record<string, string>) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    detached: true,
    stdio: "pipe",
  });
  children.push(child);
  child.stdout?.on("data", (data) => {
    logs += String(data);
  });
  child.stderr?.on("data", (data) => {
    logs += String(data);
  });
}

async function ready(url: string) {
  await vi.waitFor(
    async () => {
      try {
        const response = await nativeFetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        throw new Error(`Waiting for ${url}\n${logs.slice(-4000)}`);
      }
    },
    { timeout: 60_000, interval: 200 },
  );
}

async function send(message: string) {
  await act(async () => {
    const input = document.querySelector<HTMLTextAreaElement>("textarea:not([aria-hidden])")!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      input,
      message,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe.skipIf(!available)("Eve agent chat", () => {
  beforeAll(async () => {
    authorization = await startAgentAuthorizationServer();
    sessionId = (await authorization.createSession("user_alice")).id;
    directory = await mkdtemp(resolve(tmpdir(), "genomebrowser-eve-test-"));
    // Run the real Eve agent with a deterministic scripted model; link app features in place.
    await cp(resolve("agent"), resolve(directory, "agent"), { recursive: true });
    await cp(resolve("package.json"), resolve(directory, "package.json"));
    await cp(resolve("test/fixtures/eve-model.ts"), resolve(directory, "agent/agent.ts"));
    await symlink(resolve("node_modules"), resolve(directory, "node_modules"), "dir");
    await symlink(resolve("features"), resolve(directory, "features"), "dir");
    const evePort = await freePort();
    eve = `http://127.0.0.1:${evePort}`;
    start(
      [
        resolve("node_modules/eve/bin/eve.js"),
        "dev",
        "--no-ui",
        "--no-default-extensions",
        "--host",
        "127.0.0.1",
        "--port",
        String(evePort),
      ],
      directory,
      {
        NODE_ENV: "development",
        GB_AGENT_APP_ORIGIN: authorization.origin,
        GB_AGENT_NAMESPACE: process.env.GB_AGENT_NAMESPACE ?? "",
        REDIS_URL: testRedisUrl!,
      },
    );
    await ready(`${eve}/eve/v1/health`);
    // Same-origin rewrite boundary, as configured by withEve in Next.js.
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
      nativeFetch(typeof input === "string" && input.startsWith("/") ? `${eve}${input}` : input, {
        ...init,
        headers: {
          authorization: `Bearer ${authorization!.token("user_alice")}`,
          ...Object.fromEntries(new Headers(init?.headers)),
          origin: proxyOrigin,
        },
      }),
    );
  }, 90_000);

  afterEach(({ task }) => {
    if (task.result?.state === "fail") console.error(logs.slice(-10_000));
    probe?.unmount();
    probe = undefined;
  });

  afterAll(async () => {
    lifetime.abort();
    vi.unstubAllGlobals();
    for (const child of children) {
      if (child.pid && child.exitCode === null) {
        const exited = once(child, "exit");
        process.kill(-child.pid, "SIGTERM");
        await exited;
      }
    }
    if (directory) await rm(directory, { recursive: true, force: true });
    await authorization?.close();
    vi.unstubAllEnvs();
  }, 15_000);

  it("streams chat and runs a tool in the bound session's tab, applying the region in the browser stores", async () => {
    const relay = createCommandRelay({ url: testRedisUrl!, namespace: agentRedisNamespace() });
    const tab = await attachTab(relay, sessionId);
    if (tab === "taken") throw new Error("Expected tab attachment");
    const command = (async () => {
      const message = await tab.command();
      const app: CommandApp = {
        stores,
        sortTracks: () => ({ ok: true }),
        changeTrackMetadata: () => ({ ok: false, code: "UNSUPPORTED", error: "Not tested" }),
        exportImage: () => Promise.reject(new Error("Not rendered")),
        showImage: () => {},
        addTracksFromUrls: () => Promise.reject(new Error("Not tested")),
      };
      const result = await runCommand(app, message, lifetime.signal);
      expect(await relay.reply(sessionId, { commandId: message.commandId, result })).toBe(true);
      return result;
    })();

    try {
      probe = await renderWithProbe(
        <AgentChat sessionId={sessionId} signal={lifetime.signal} connected />,
      );
      await send("hello");
      await act(async () => {
        await vi.waitFor(
          () => expect(document.body.textContent).toContain("Hello from the genome browser agent."),
          { timeout: 30_000 },
        );
      });
      await send("navigate to chr1:1001-2000");
      await act(async () => {
        await vi.waitFor(() => expect(document.body.textContent).toContain("Browser result:"), {
          timeout: 30_000,
        });
      });
      expect(await command).toMatchObject({
        ok: true,
        value: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
      });
      expect(stores.useBrowserStore.getState().region).toMatchObject({
        chromosome: "chr1",
        start: 1000,
        end: 2000,
      });
      expect(document.body.textContent).toContain("completed");
    } finally {
      tab.close();
      await relay.close();
    }
  }, 70_000);

  it("Stop cancels a command across Eve's real MCP connection", async () => {
    const relay = createCommandRelay({ url: testRedisUrl!, namespace: agentRedisNamespace() });
    const tab = await attachTab(relay, sessionId);
    if (tab === "taken") throw new Error("Expected tab attachment");
    try {
      probe = await renderWithProbe(
        <AgentChat sessionId={sessionId} signal={lifetime.signal} connected />,
      );
      await send("navigate to chr1:1001-2000");
      const delivered = await tab.command();
      await act(async () => {
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent === "Stop")!
          .click();
      });
      expect(await tab.next()).toEqual({ event: "cancel", commandId: delivered.commandId });
    } finally {
      tab.close();
      await relay.close();
    }
  }, 30_000);

  it("Stop cancels an active reply and allows another message", async () => {
    probe = await renderWithProbe(
      <AgentChat sessionId={sessionId} signal={lifetime.signal} connected />,
    );
    await send("wait for stop");
    await vi.waitFor(() => expect(document.body.textContent).toContain("Waiting for Stop."), {
      timeout: 15_000,
    });
    const stop = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Stop",
    )!;
    await act(async () => stop.click());
    await vi.waitFor(() => expect(document.body.textContent).not.toContain("Working…"), {
      timeout: 15_000,
    });
    await send("hello again");
    await vi.waitFor(
      () =>
        expect(
          document
            .querySelector('[role="log"]')
            ?.textContent?.match(/Hello from the genome browser agent/g),
        ).toHaveLength(1),
      { timeout: 15_000 },
    );
  }, 50_000);

  it("rejects requests without a valid browser-session header or credentials", async () => {
    const missingHeader = await nativeFetch(`${eve}/eve/v1/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(missingHeader.status).toBe(401);

    const anonymous = await nativeFetch(`${eve}/eve/v1/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-genomebrowser-session-id": sessionId,
        Origin: "https://untrusted.test",
      },
      body: JSON.stringify({}),
    });
    expect(anonymous.status).toBe(401);
  });

  it("accepts Clerk cookies and rejects forged credentials, unowned sessions, and disabled RC", async () => {
    const headers = {
      "Content-Type": "application/json",
      "x-genomebrowser-session-id": sessionId,
    };
    const create = (extra: Record<string, string>) =>
      nativeFetch(`${eve}/eve/v1/session`, {
        method: "POST",
        headers: { ...headers, ...extra },
        body: "{}",
      });
    const accepted = await create({ cookie: authorization!.cookie("user_alice") });
    expect(accepted.ok).toBe(true);
    const { sessionId: conversation } = (await accepted.json()) as { sessionId: string };
    expect((await create({ authorization: "Bearer forged" })).status).toBe(401);
    expect(
      (await create({ authorization: `Bearer ${authorization!.token("user_bob")}` })).status,
    ).toBe(403);
    await authorization!.setEnabled("user_alice", false);
    try {
      expect(
        (await create({ authorization: `Bearer ${authorization!.token("user_alice")}` })).status,
      ).toBe(403);
      const stopped = await nativeFetch(`${eve}/eve/v1/session/${conversation}/cancel`, {
        method: "POST",
        headers: { ...headers, authorization: `Bearer ${authorization!.token("user_alice")}` },
      });
      expect(stopped.ok).toBe(true);
    } finally {
      await authorization!.setEnabled("user_alice", true);
    }
  });

  it("binds conversation reads, messages, and Stop to its user and browser session", async () => {
    const alice = await nativeFetch(`${eve}/eve/v1/session`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${authorization!.token("user_alice")}`,
        "x-genomebrowser-session-id": sessionId,
      },
    });
    expect(alice.ok).toBe(true);
    const { sessionId: conversation } = (await alice.json()) as { sessionId: string };
    const bobSession = await authorization!.createSession("user_bob");
    for (const [method, suffix] of [
      ["GET", "/stream?follow=false"],
      ["POST", ""],
      ["POST", "/cancel"],
    ]) {
      const denied = await nativeFetch(`${eve}/eve/v1/session/${conversation}${suffix}`, {
        method,
        headers: {
          authorization: `Bearer ${authorization!.token("user_bob")}`,
          "x-genomebrowser-session-id": bobSession.id,
        },
      });
      expect(denied.status).toBe(403);
    }
    const otherSession = await authorization!.createSession("user_alice");
    const retargeted = await nativeFetch(
      `${eve}/eve/v1/session/${conversation}/stream?follow=false`,
      {
        headers: {
          authorization: `Bearer ${authorization!.token("user_alice")}`,
          "x-genomebrowser-session-id": otherSession.id,
        },
      },
    );
    expect(retargeted.status).toBe(403);
  });

  it.each(["unmount", "abort"])(
    "cancels a first message accepted after %s and releases its stream",
    async (teardown) => {
      probe?.unmount();
      const signal = new AbortController();
      const accepted = Promise.withResolvers<string>();
      const releaseAcceptance = Promise.withResolvers<void>();
      const cancelled = Promise.withResolvers<Response>();
      const routedFetch = globalThis.fetch;
      let streamSignal: AbortSignal | null | undefined;
      vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/stream")) streamSignal = init?.signal;
        const response = await routedFetch(input, init);
        if (url.endsWith("/eve/v1/session") && init?.method === "POST") {
          const body = (await response.clone().json()) as { sessionId: string };
          accepted.resolve(body.sessionId);
          await releaseAcceptance.promise;
        }
        if (url.endsWith("/cancel")) cancelled.resolve(response.clone());
        return response;
      });
      try {
        probe = await renderWithProbe(
          <StrictMode>
            <AgentChat sessionId={sessionId} signal={signal.signal} connected />
          </StrictMode>,
        );
        await send("wait for stop");
        const eveSessionId = await accepted.promise;
        await act(async () => {
          if (teardown === "abort") signal.abort();
          probe?.unmount();
        });
        releaseAcceptance.resolve();
        const response = await cancelled.promise;
        expect(response.ok).toBe(true);
        const client = new Client({
          baseUrl: eve,
          headers: {
            authorization: `Bearer ${authorization!.token("user_alice")}`,
            "x-genomebrowser-session-id": sessionId,
          },
        });
        await vi.waitFor(
          async () => {
            const snapshot = await client.sessions.attach(eveSessionId).snapshot();
            expect(
              snapshot.events.find((event) => event.type === "turn.settled")?.data.outcome,
            ).toBe("cancelled");
          },
          { timeout: 15_000 },
        );
        await vi.waitFor(() => expect(streamSignal?.aborted).toBe(true));
      } finally {
        releaseAcceptance.resolve();
        probe?.unmount();
        vi.stubGlobal("fetch", routedFetch);
      }
    },
    30_000,
  );
});
