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
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { AgentChat } from "../features/agent/components/AgentChat";
import { createStores } from "../features/assemblies/assemblies";
import { runCommand } from "../features/agent/commands";
import { commandMessageSchema } from "../features/agent/commands/protocol";
import { createCommandRelay } from "../features/agent/commands/server/relay";
import { testRedisUrl } from "./redis";

const proxyOrigin = "https://browser.test:8443";
const sessionId = "e376d6ef-36c9-4d01-ad52-9847bad99f3c";
const children: ChildProcess[] = [];
const nativeFetch = globalThis.fetch;
let directory: string;
let eve: string;
let logs = "";
let probe: Probe | undefined;
const lifetime = new AbortController();
const stores = createStores("hg38")!;

async function port() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
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

beforeAll(async () => {
  directory = await mkdtemp(resolve(tmpdir(), "genomebrowser-eve-test-"));
  // The agent with a scripted model. Its tools import the app's features, so link them in place.
  await cp(resolve("agent"), resolve(directory, "agent"), { recursive: true });
  await cp(resolve("package.json"), resolve(directory, "package.json"));
  await cp(resolve("test/fixtures/eve-model.ts"), resolve(directory, "agent/agent.ts"));
  await symlink(resolve("node_modules"), resolve(directory, "node_modules"), "dir");
  await symlink(resolve("features"), resolve(directory, "features"), "dir");
  const evePort = await port();
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
      GB_AGENT_DEV_ORIGINS: proxyOrigin,
      ...(testRedisUrl && { REDIS_URL: testRedisUrl }),
    },
  );
  await ready(`${eve}/eve/v1/health`);
  // Same-origin rewrite boundary, as configured by withEve in Next.js.
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) =>
    nativeFetch(typeof input === "string" && input.startsWith("/") ? `${eve}${input}` : input, {
      ...init,
      headers: { ...Object.fromEntries(new Headers(init?.headers)), origin: proxyOrigin },
    }),
  );
}, 90_000);

afterEach(() => {
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
}, 15_000);

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

it.skipIf(!testRedisUrl)(
  "streams chat and runs a tool in the bound session's tab, applying the region in the browser stores",
  async () => {
    // The tab's side of the relay, as the command stream route runs it.
    const relay = createCommandRelay({ url: testRedisUrl! });
    const stream = await relay.connect(sessionId, crypto.randomUUID(), lifetime.signal);
    expect(stream).not.toBeNull();
    const reader = stream!.pipeThrough(new TextDecoderStream()).getReader();
    const command = (async () => {
      let buffer = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("Tab disconnected before command");
        buffer += chunk.value;
        const match = /event: command\ndata: ([^\n]+)\n\n/.exec(buffer);
        if (!match) continue;
        const message = commandMessageSchema.parse(JSON.parse(match[1]));
        const app = {
          stores,
          exportImage: () => Promise.reject(new Error("Not rendered")),
          showImage: () => {},
        };
        const result = await runCommand(app, message, lifetime.signal);
        expect(await relay.acknowledge(sessionId, { commandId: message.commandId, result })).toBe(
          true,
        );
        return result;
      }
    })().then(
      (result) => ({ result }),
      (error: unknown) => ({ error }),
    );
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
      result: {
        ok: true,
        value: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
      },
    });
    expect(stores.useBrowserStore.getState().region).toMatchObject({
      chromosome: "chr1",
      start: 1000,
      end: 2000,
    });
    expect(document.body.textContent).toContain("completed");
    await reader.cancel();
    await relay.close();
  },
  70_000,
);

it("rejects requests without a valid browser-session header", async () => {
  const response = await nativeFetch(`${eve}/eve/v1/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello" }),
  });
  expect(response.status).toBe(401);
});

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

it("rejects untrusted browser origins even with a session header", async () => {
  const response = await nativeFetch(`${eve}/eve/v1/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-genomebrowser-session-id": sessionId,
      Origin: "https://untrusted.test",
    },
    body: JSON.stringify({}),
  });
  expect(response.status).toBe(401);
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
      const url = String(input);
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
        headers: { "x-genomebrowser-session-id": sessionId },
      });
      await vi.waitFor(
        async () => {
          const snapshot = await client.sessions.attach(eveSessionId).snapshot();
          expect(snapshot.events.find((event) => event.type === "turn.settled")?.data.outcome).toBe(
            "cancelled",
          );
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
