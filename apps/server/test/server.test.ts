import { afterEach, beforeEach, expect, test } from "vitest";
import { createBrowserServer } from "../src/server.ts";
import type { ConnectedEvent, BrowserCommand } from "../src/protocol.ts";

let server: ReturnType<typeof createBrowserServer>;
let base: string;
const streams: AbortController[] = [];
beforeEach(async () => {
  server = createBrowserServer({ apiToken: "admin-secret", commandTimeoutMs: 500 });
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
function post(path: string, body: unknown, token = "admin-secret") {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("relays a command and returns only its browser acknowledgement", async () => {
  const client = await browser();
  const list = await fetch(`${base}/clients`, {
    headers: { Authorization: "Bearer admin-secret" },
  });
  expect(await list.json()).toEqual({ clients: [{ clientId: client.clientId }] });
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  expect(command).toMatchObject({ type: "region.set", region });
  expect(command.expiresAt).toBeGreaterThan(Date.now());
  const result = { ok: true, region: { ...region, end: 80 }, clamped: true };
  expect(
    (
      await post(
        `/clients/${client.clientId}/results`,
        { commandId: command.commandId, result },
        client.resultToken,
      )
    ).status,
  ).toBe(200);
  const completed = await response;
  expect(completed.status).toBe(200);
  expect(await completed.json()).toEqual({ commandId: command.commandId, result });
});

test("preserves browser mutation failure", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  const result = { ok: false, code: "UNKNOWN_CHROMOSOME", error: "Unknown chromosome" };
  await post(
    `/clients/${client.clientId}/results`,
    { commandId: command.commandId, result },
    client.resultToken,
  );
  const completed = await response;
  expect(completed.status).toBe(422);
  expect(await completed.json()).toEqual({ commandId: command.commandId, result });
});

test("rejects unauthorized requests, invalid coordinates, unknown clients, and foreign origins", async () => {
  const client = await browser();
  expect((await fetch(`${base}/clients`)).status).toBe(401);
  expect((await post(`/clients/${client.clientId}/region`, region, "wrong")).status).toBe(401);
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
        headers: { Authorization: "Bearer admin-secret" },
        body: "{",
      })
    ).status,
  ).toBe(400);
});

test("times out without storing a command for later replay", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  const command = await client.event<BrowserCommand>();
  expect((await response).status).toBe(504);
  expect(
    (
      await post(
        `/clients/${client.clientId}/results`,
        { commandId: command.commandId, result: { ok: true, region, clamped: false } },
        client.resultToken,
      )
    ).status,
  ).toBe(409);
});

test("disconnect rejects pending commands and removes the client", async () => {
  const client = await browser();
  const response = post(`/clients/${client.clientId}/region`, region);
  await client.event<BrowserCommand>();
  client.abort.abort();
  expect((await response).status).toBe(409);
  const list = await fetch(`${base}/clients`, {
    headers: { Authorization: "Bearer admin-secret" },
  });
  expect(await list.json()).toEqual({ clients: [] });
});

test("rejects another browser's acknowledgement and malformed results", async () => {
  const first = await browser();
  const second = await browser();
  const response = post(`/clients/${first.clientId}/region`, region);
  const command = await first.event<BrowserCommand>();
  const reply = { commandId: command.commandId, result: { ok: true, region, clamped: false } };
  expect((await post(`/clients/${first.clientId}/results`, reply, second.resultToken)).status).toBe(
    401,
  );
  expect(
    (await post(`/clients/${second.clientId}/results`, reply, second.resultToken)).status,
  ).toBe(409);
  expect(
    (
      await post(
        `/clients/${first.clientId}/results`,
        { commandId: command.commandId, result: { ok: true } },
        first.resultToken,
      )
    ).status,
  ).toBe(400);
  await post(`/clients/${first.clientId}/results`, reply, first.resultToken);
  expect((await response).status).toBe(200);
});
