import { request } from "node:http";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createBrowserServer } from "../src/server.ts";
import type { ConnectedEvent, BrowserCommand, SessionSnapshot } from "../src/protocol.ts";
import { createSqliteSessionRepository } from "../src/storage/sqlite.ts";
import type { SessionRepository } from "../src/storage/sessionRepository.ts";

let server: ReturnType<typeof createBrowserServer>;
let base: string;
let sqlite: ReturnType<typeof createSqliteSessionRepository>;
let sessions: SessionRepository;
const streams: AbortController[] = [];
beforeEach(async () => {
  sqlite = createSqliteSessionRepository(":memory:");
  sessions = { load: () => sqlite.load(), save: (snapshot) => sqlite.save(snapshot) };
  server = createBrowserServer({ commandTimeoutMs: 500, sessions });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  base = `http://127.0.0.1:${address.port}/api/browser`;
});
afterEach(async () => {
  for (const stream of streams.splice(0)) stream.abort();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  sqlite.close();
});
async function browser() {
  const abort = new AbortController();
  streams.push(abort);
  const response = await fetch(`${base}/events`, { signal: abort.signal });
  const reader = response.body!.getReader();
  let buffer = "";
  async function event<T>() {
    while (!buffer.includes("\n\n")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("Stream ended");
      buffer += new TextDecoder().decode(value);
    }
    const end = buffer.indexOf("\n\n");
    const chunk = buffer.slice(0, end);
    buffer = buffer.slice(end + 2);
    return JSON.parse(
      chunk
        .split("\n")
        .find((line) => line.startsWith("data: "))!
        .slice(6),
    ) as T;
  }
  const connection = await event<ConnectedEvent>();
  return { ...connection, event, abort };
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
function post(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Node's HTTP client preserves the supplied Host; fetch can replace it with the URL authority.
function getWithHost(path: string, host: string) {
  return new Promise<Response>((resolve, reject) => {
    const caller = request(
      `${base}${path}`,
      {
        headers: { Host: host, "X-Forwarded-Host": "localhost:3001" },
      },
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

test("relays a command and returns only its browser acknowledgement", async () => {
  const client = await browser();
  const list = await fetch(`${base}/clients`, {});
  expect(await list.json()).toEqual({ clients: [{ clientId: client.clientId }] });
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  expect(command).toMatchObject({ type: "region.set", region });
  expect(command.expiresAt).toBeGreaterThan(Date.now());
  const result = { ok: true, region: { ...region, end: 80 }, clamped: true };
  expect(
    (await post(`/clients/${client.clientId}/results`, { commandId: command.commandId, result }))
      .status,
  ).toBe(200);
  const completed = await response;
  expect(completed.status).toBe(200);
  expect(await completed.json()).toEqual({ commandId: command.commandId, result });
});

test("persists a validated session and supplies it to a new connection", async () => {
  const first = await browser();
  expect(first.snapshot).toBeNull();
  expect((await post(`/clients/${first.clientId}/session`, snapshot)).status).toBe(200);
  const second = await browser();
  expect(second.snapshot).toEqual(snapshot);
  expect(
    (await post(`/clients/${first.clientId}/session`, { ...snapshot, version: 2 })).status,
  ).toBe(400);
  expect((await browser()).snapshot).toEqual(snapshot);
});

test("local commands, sessions, and client listing require no authentication setup", async () => {
  const client = await browser();
  expect(client).not.toHaveProperty("resultToken");
  expect((await fetch(`${base}/clients`)).status).toBe(200);
  expect((await post(`/clients/${client.clientId}/session`, snapshot)).status).toBe(200);
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  await post(`/clients/${client.clientId}/results`, {
    commandId: command.commandId,
    result: { ok: true, region, clamped: false },
  });
  expect((await response).status).toBe(200);
});

test("session writes accept larger track configuration within their separate 1 MB limit", async () => {
  const client = await browser();
  const withConfig = (length: number): SessionSnapshot => ({
    ...snapshot,
    tracks: [{ ...snapshot.tracks[0], config: { description: "x".repeat(length) } }],
  });
  const saved = withConfig(20_000);
  expect((await post(`/clients/${client.clientId}/session`, saved)).status).toBe(200);
  expect((await post(`/clients/${client.clientId}/session`, withConfig(1_048_576))).status).toBe(
    400,
  );
  expect((await browser()).snapshot).toEqual(saved);
});

test("reports unavailable storage without registering a client or acknowledging a failed save", async () => {
  sessions.load = async () => {
    throw new Error("storage offline");
  };
  expect((await fetch(`${base}/events`)).status).toBe(503);
  expect(await (await fetch(`${base}/clients`)).json()).toEqual({ clients: [] });
  sessions.load = () => sqlite.load();
  const client = await browser();
  sessions.save = async () => {
    throw new Error("storage offline");
  };
  expect((await post(`/clients/${client.clientId}/session`, snapshot)).status).toBe(503);
  expect((await browser()).snapshot).toBeNull();
});

test("SQLite restores the shared session after closing and reopening the file", async () => {
  const directory = mkdtempSync(join(tmpdir(), "browser-session-"));
  const path = join(directory, "session.sqlite");
  const initial = createSqliteSessionRepository(path);
  try {
    await initial.save(snapshot);
  } finally {
    initial.close();
  }
  const reopened = createSqliteSessionRepository(path);
  try {
    expect(await reopened.load()).toEqual(snapshot);
  } finally {
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("preserves browser mutation failure", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  const result = { ok: false, code: "UNKNOWN_CHROMOSOME", error: "Unknown chromosome" };
  await post(`/clients/${client.clientId}/results`, { commandId: command.commandId, result });
  const completed = await response;
  expect(completed.status).toBe(422);
  expect(await completed.json()).toEqual({ commandId: command.commandId, result });
});

test("rejects invalid coordinates, unknown clients, and foreign origins", async () => {
  const client = await browser();
  for (const invalid of [
    { ...region, start: -1 },
    { ...region, end: 10 },
    { ...region, start: 0.5 },
    { ...region, end: Number.MAX_SAFE_INTEGER + 1 },
    { ...region, extra: true },
  ]) {
    expect((await post(`/clients/${client.clientId}/region`, invalid)).status).toBe(400);
  }
  expect(
    (
      await post(`/clients/${client.clientId}/region`, {
        ...region,
        chromosome: "x".repeat(17_000),
      })
    ).status,
  ).toBe(400);
  expect((await post("/clients/missing/region", region)).status).toBe(404);
  expect(
    (await fetch(`${base}/events`, { headers: { Origin: "https://untrusted.example" } })).status,
  ).toBe(403);
  expect(
    (
      await fetch(`${base}/clients/${client.clientId}/region`, {
        method: "POST",
        body: "{",
      })
    ).status,
  ).toBe(400);
});

test.each(["localhost", "localhost:3001", "127.0.0.1:3001", "[::1]", "[::1]:3001"])(
  "accepts local Host %s without credentials",
  async (host) => {
    expect((await getWithHost("/clients", host)).status).toBe(200);
  },
);

test.each([
  "hostile.example",
  "localhost.hostile.example",
  "127.0.0.1.hostile.example",
  "0.0.0.0:3001",
])("rejects Host %s even when forwarded headers claim localhost", async (host) => {
  const response = await getWithHost("/events", host);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Host is not allowed" });
  expect(await (await fetch(`${base}/clients`)).json()).toEqual({ clients: [] });
});

test("local startup rejects a public bind address before opening storage", () => {
  const result = spawnSync(process.execPath, ["src/main.ts"], {
    env: { ...process.env, GB_SERVER_HOST: "0.0.0.0" },
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("GB_SERVER_HOST must be localhost, 127.0.0.1, or ::1");
});

test("times out without storing a command for later replay", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  expect((await response).status).toBe(504);
  expect(
    (
      await post(`/clients/${client.clientId}/results`, {
        commandId: command.commandId,
        result: { ok: true, region, clamped: false },
      })
    ).status,
  ).toBe(409);
});

test("disconnect rejects pending commands and removes the client", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  await client.event<BrowserCommand>();
  client.abort.abort();
  expect((await response).status).toBe(409);
  const list = await fetch(`${base}/clients`, {});
  expect(await list.json()).toEqual({ clients: [] });
});

test("caller cancellation removes the pending command before a late acknowledgement", async () => {
  const client = await browser();
  const caller = request(`${base}/clients/${client.clientId}/region`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  caller.end(JSON.stringify(region));
  const command = await client.event<BrowserCommand>();
  const closed = new Promise<void>((resolve) => caller.once("close", resolve));
  caller.on("error", (error: NodeJS.ErrnoException) => {
    expect(error.code).toBe("ECONNRESET");
  });
  caller.destroy();
  await closed;
  const reply = { commandId: command.commandId, result: { ok: true, region, clamped: false } };
  expect((await post(`/clients/${client.clientId}/results`, reply)).status).toBe(409);
});

test("shutdown ends open streams and rejects pending commands", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  await client.event<BrowserCommand>();
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  expect((await response).status).toBe(409);
  await expect(client.event()).rejects.toThrow("Stream ended");
  await closed;
});

test("rejects oversized chunked JSON without dispatching a browser command", async () => {
  const client = await browser();
  const status = new Promise<number | undefined>((resolve, reject) => {
    const caller = request(
      `${base}/clients/${client.clientId}/region`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    caller.on("error", reject);
    caller.write('{"chromosome":"');
    caller.write("x".repeat(17_000));
    caller.end('","start":10,"end":100}');
  });
  expect(await status).toBe(400);
  // A subsequent valid command must be the next event on the same live stream.
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  expect(command.region).toEqual(region);
  await post(`/clients/${client.clientId}/results`, {
    commandId: command.commandId,
    result: { ok: true, region, clamped: false },
  });
  expect((await response).status).toBe(200);
});

test("rejects another browser's acknowledgement and malformed results", async () => {
  const first = await browser();
  const second = await browser();
  const response = post(`/clients/${first.clientId}/region`, region);
  const command = await first.event<BrowserCommand>();
  const reply = { commandId: command.commandId, result: { ok: true, region, clamped: false } };
  expect((await post(`/clients/${second.clientId}/results`, reply)).status).toBe(409);
  expect(
    (
      await post(`/clients/${first.clientId}/results`, {
        commandId: command.commandId,
        result: { ok: true },
      })
    ).status,
  ).toBe(400);
  await post(`/clients/${first.clientId}/results`, reply);
  expect((await response).status).toBe(200);
});
