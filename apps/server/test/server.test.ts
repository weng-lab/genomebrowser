import { request } from "node:http";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createBrowserServer } from "../src/server.ts";
import type { CommandMessage, SessionSnapshot } from "../src/protocol.ts";
import { createSqliteSessionRepository } from "../src/storage/sqlite.ts";

let server: ReturnType<typeof createBrowserServer>;
let origin: string;
let base: string;
let sqlite: ReturnType<typeof createSqliteSessionRepository>;
let agent: Client;
const streams: AbortController[] = [];

beforeEach(async () => {
  sqlite = createSqliteSessionRepository(":memory:");
  server = createBrowserServer({ commandTimeoutMs: 500, sessions: sqlite });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  origin = `http://127.0.0.1:${address.port}`;
  base = `${origin}/api/sessions`;
  agent = new Client({ name: "test-agent", version: "0.0.0" });
  await agent.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`)));
});

afterEach(async () => {
  await agent.close();
  for (const stream of streams.splice(0)) stream.abort();
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  // Aborted fetch streams can linger in the client's keep-alive pool.
  server.closeAllConnections();
  await closed;
  sqlite.close();
});

/** Open a session's command stream the way a browser tab does. */
async function openTab(sessionId = "local") {
  const abort = new AbortController();
  streams.push(abort);
  const response = await fetch(`${base}/${sessionId}/rpc`, { signal: abort.signal });
  if (!response.ok) {
    await response.body?.cancel();
    return { status: response.status } as const;
  }
  const reader = response.body!.getReader();
  let buffer = "";
  async function command(): Promise<CommandMessage> {
    for (;;) {
      const end = buffer.indexOf("\n\n");
      if (end !== -1) {
        const chunk = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = chunk.split("\n").find((line) => line.startsWith("data: "));
        if (data) return JSON.parse(data.slice(6));
        continue;
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("Stream ended");
      buffer += new TextDecoder().decode(value);
    }
  }
  function reply(commandId: string, result: unknown) {
    return send("POST", `/${sessionId}/rpc`, { commandId, result });
  }
  return { status: response.status, command, reply, abort } as const;
}

async function connectedTab(sessionId = "local") {
  const tab = await openTab(sessionId);
  if (tab.status !== 200 || !("command" in tab)) throw new Error(`Tab rejected: ${tab.status}`);
  return tab;
}

function send(method: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setRegion(sessionId = "local", signal?: AbortSignal) {
  return agent.callTool(
    { name: "set_region", arguments: { sessionId, region } },
    { signal, timeout: 5_000 },
  );
}

const region = { chromosome: "chr1", start: 10, end: 100 };
const snapshot: SessionSnapshot = {
  version: 1,
  browser: {
    assembly: "hg38",
    region,
    basePairDetail: { maxVisibleBases: 100 },
    marginWidth: 50,
    trackWidth: 1000,
    fontSize: 10,
    titleSize: 12,
    highlights: [{ id: "highlight", region: { start: 20, end: 30 }, color: "red" }],
    selectionMode: "pan",
    selectionHighlight: { color: "blue" },
  },
  tracks: [
    {
      type: "ruler",
      base: { id: "ruler", title: "Coordinates", display: "full", height: 30, color: "#000000" },
      config: {},
      source: "host",
    },
  ],
  pinnedTrackIds: ["ruler"],
};

// Node's HTTP client preserves the supplied Host; fetch can replace it with the URL authority.
function getWithHost(path: string, host: string) {
  return new Promise<Response>((resolve, reject) => {
    const caller = request(
      `${origin}${path}`,
      { headers: { Host: host, "X-Forwarded-Host": "localhost:3001" } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(new Response(body, { status: response.statusCode })));
        response.on("error", reject);
      },
    );
    caller.on("error", reject);
    caller.end();
  });
}

test("an MCP tool call runs in the session's tab and returns the tab's state", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  expect(command).toMatchObject({ name: "set_region", params: { region } });
  expect(command.expiresAt).toBeGreaterThan(Date.now());
  expect((await tab.reply(command.commandId, { ok: true, state: snapshot })).status).toBe(200);
  const result = await call;
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent).toEqual({ state: snapshot });
});

test("lists every browser command as an MCP tool with a session ID", async () => {
  const { tools } = await agent.listTools();
  expect(tools.map((tool) => tool.name)).toEqual(["set_region"]);
  expect(tools[0].inputSchema.required).toEqual(expect.arrayContaining(["sessionId", "region"]));
});

test("reports the tab's rejection as a tool error", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  const rejection = { ok: false, code: "UNKNOWN_CHROMOSOME", error: "Unknown chromosome" };
  await tab.reply(command.commandId, rejection);
  const result = await call;
  expect(result.isError).toBe(true);
  expect(result.content).toEqual([
    { type: "text", text: "UNKNOWN_CHROMOSOME: Unknown chromosome" },
  ]);
});

test("a tool call fails clearly when the session has no open tab", async () => {
  const result = await setRegion("closed");
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain("NOT_CONNECTED");
});

test("the first tab keeps the session and a second tab is rejected", async () => {
  const first = await connectedTab();
  expect((await openTab()).status).toBe(409);
  expect((await openTab("other")).status).toBe(200);

  first.abort.abort();
  await expect.poll(async () => (await openTab()).status).toBe(200);
});

test("saves and loads sessions by ID, independent of tab connections", async () => {
  expect((await fetch(`${base}/local`)).status).toBe(404);
  expect((await send("PUT", "/local", snapshot)).status).toBe(200);
  expect(await (await fetch(`${base}/local`)).json()).toEqual(snapshot);
  expect((await fetch(`${base}/other`)).status).toBe(404);
  expect((await send("PUT", "/local", { ...snapshot, version: 2 })).status).toBe(400);
  expect((await send("PUT", "/bad%20id", snapshot)).status).toBe(400);
});

test("session saves accept large track configuration up to 1 MB", async () => {
  const withConfig = (length: number): SessionSnapshot => ({
    ...snapshot,
    tracks: [{ ...snapshot.tracks[0], config: { description: "x".repeat(length) } }],
  });
  expect((await send("PUT", "/local", withConfig(20_000))).status).toBe(200);
  expect((await send("PUT", "/local", withConfig(1_048_576))).status).toBe(413);
});

test("SQLite keeps sessions after closing and reopening the file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "browser-session-"));
  const path = join(directory, "session.sqlite");
  const initial = createSqliteSessionRepository(path);
  try {
    await initial.save("local", snapshot);
  } finally {
    initial.close();
  }
  const reopened = createSqliteSessionRepository(path);
  try {
    expect(await reopened.load("local")).toEqual(snapshot);
    expect(await reopened.load("other")).toBeNull();
  } finally {
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("times out without storing a command for later replay", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  expect(JSON.stringify((await call).content)).toContain("TIMEOUT");
  expect((await tab.reply(command.commandId, { ok: true, state: snapshot })).status).toBe(409);
});

test("closing the tab fails its pending commands and frees the session", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  await tab.command();
  tab.abort.abort();
  expect(JSON.stringify((await call).content)).toContain("NOT_CONNECTED");
  await expect.poll(async () => (await openTab()).status).toBe(200);
});

test("agent cancellation removes the pending command before a late reply", async () => {
  const tab = await connectedTab();
  const cancel = new AbortController();
  const call = setRegion("local", cancel.signal);
  const command = await tab.command();
  cancel.abort();
  await expect(call).rejects.toThrow(/abort/i);
  await expect
    .poll(async () => (await tab.reply(command.commandId, { ok: true, state: snapshot })).status)
    .toBe(409);
});

test("shutdown ends open streams and fails pending commands", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  await tab.command();
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  expect(JSON.stringify((await call).content)).toContain("NOT_CONNECTED");
  await expect(tab.command()).rejects.toThrow("Stream ended");
  server.closeAllConnections();
  await closed;
});

test("rejects replies for another session and malformed results", async () => {
  const tab = await connectedTab();
  const other = await connectedTab("other");
  const call = setRegion();
  const command = await tab.command();
  expect((await other.reply(command.commandId, { ok: true, state: snapshot })).status).toBe(409);
  expect((await tab.reply(command.commandId, { ok: true })).status).toBe(400);
  await tab.reply(command.commandId, { ok: true, state: snapshot });
  expect((await call).isError).toBeFalsy();
});

test("rejects foreign origins and malformed JSON", async () => {
  expect(
    (await fetch(`${base}/local/rpc`, { headers: { Origin: "https://untrusted.example" } })).status,
  ).toBe(403);
  expect((await fetch(`${base}/local`, { method: "PUT", body: "{" })).status).toBe(400);
});

test.each(["localhost", "localhost:3001", "127.0.0.1:3001", "[::1]", "[::1]:3001"])(
  "accepts local Host %s without credentials",
  async (host) => {
    expect((await getWithHost("/health", host)).status).toBe(200);
  },
);

test.each([
  "hostile.example",
  "localhost.hostile.example",
  "127.0.0.1.hostile.example",
  "0.0.0.0:3001",
])("rejects Host %s even when forwarded headers claim localhost", async (host) => {
  const response = await getWithHost("/api/sessions/local/rpc", host);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Host is not allowed" });
});

test("local startup rejects a public bind address before opening storage", () => {
  const result = spawnSync(process.execPath, ["src/main.ts"], {
    env: { ...process.env, GB_SERVER_HOST: "0.0.0.0" },
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("GB_SERVER_HOST must be localhost, 127.0.0.1, or ::1");
});
