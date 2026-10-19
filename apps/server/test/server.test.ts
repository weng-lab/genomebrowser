import { request } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { connect, createServer, type AddressInfo } from "node:net";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { CommandMessage } from "@weng-lab/contracts";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createBrowserServer } from "../src/server.ts";

let server: ReturnType<typeof createBrowserServer>;
let origin: string;
let base: string;
let agent: Client;
const streams: AbortController[] = [];

beforeEach(async () => {
  // A long shutdown timeout, so that forcing connections closed cannot hide a stuck one.
  server = createBrowserServer({ commandTimeoutMs: 500, shutdownTimeoutMs: 60_000 });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing server address");
  origin = `http://127.0.0.1:${address.port}`;
  base = `${origin}/rpc`;
  agent = new Client({ name: "test-agent", version: "0.0.0" });
  await agent.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`)));
});

afterEach(async () => {
  await agent.close();
  for (const stream of streams.splice(0)) stream.abort();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Open a session's command stream the way a browser tab does. */
async function openTab(sessionId = "local") {
  const abort = new AbortController();
  streams.push(abort);
  const response = await fetch(`${base}/${sessionId}`, { signal: abort.signal });
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
    return send("POST", `/${sessionId}`, { commandId, result });
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

function setRegion(sessionId = "local", signal?: AbortSignal, params: object = { region }) {
  return agent.callTool(
    { name: "set_region", arguments: { sessionId, ...params } },
    { signal, timeout: 5_000 },
  );
}

const region = { chromosome: "chr1", start: 10, end: 100 };
const applied = { ok: true, value: { region, clamped: false } };

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

test("an MCP tool call runs in the session's tab and returns the tab's result", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  expect(command).toMatchObject({ name: "set_region", params: { region } });
  expect(command.expiresAt).toBeGreaterThan(Date.now());
  expect((await tab.reply(command.commandId, applied)).status).toBe(200);
  const result = await call;
  expect(result.isError).toBeFalsy();
  expect(result.structuredContent).toEqual({ region, clamped: false });
});

test("lists the region tool, with a session ID and its result schema", async () => {
  const { tools } = await agent.listTools();
  expect(tools.map((tool) => tool.name)).toEqual(["set_region"]);
  expect(tools[0].inputSchema.required).toEqual(expect.arrayContaining(["sessionId", "region"]));
  expect(tools[0].outputSchema?.required).toEqual(["region", "clamped"]);
});

test.each([
  { region: { chromosome: "chr1", start: 100, end: 100 } },
  { region: { chromosome: "chr1", start: -1, end: 100 } },
  { region: { chromosome: "chr1", start: 0.5, end: 100 } },
  { region, extra: true },
  {},
])("rejects invalid parameters %j before reaching a tab", async (params) => {
  const tab = await connectedTab();
  const result = await setRegion("local", undefined, params);
  expect(result.isError).toBe(true);
  const next = await Promise.race([
    tab.command(),
    new Promise((resolve) => setTimeout(resolve, 50, "none")),
  ]);
  expect(next).toBe("none");
});

test("reports a tab result that does not match the tool's result schema", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  await tab.reply(command.commandId, { ok: true, value: { region } });
  const result = await call;
  expect(result.isError).toBe(true);
  expect(JSON.stringify(result.content)).toContain("INVALID_REPLY");
});

test("has no session persistence routes", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) {
    expect((await fetch(`${origin}/api/sessions/local`, { method })).status).toBe(404);
  }
  expect((await fetch(`${origin}/api/sessions`)).status).toBe(404);
  expect((await fetch(`${origin}/api/sessions/local/rpc`)).status).toBe(404);
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

test("times out without storing a command for later replay", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  const command = await tab.command();
  expect(JSON.stringify((await call).content)).toContain("TIMEOUT");
  expect((await tab.reply(command.commandId, applied)).status).toBe(409);
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
  await expect.poll(async () => (await tab.reply(command.commandId, applied)).status).toBe(409);
});

test("shutdown ends open streams and fails pending commands", async () => {
  const tab = await connectedTab();
  const call = setRegion();
  await tab.command();
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  expect(JSON.stringify((await call).content)).toContain("NOT_CONNECTED");
  await expect(tab.command()).rejects.toThrow("Stream ended");
  // The tab's and agent's keep-alive connections close without forcing them.
  await closed;
}, 1_000);

test("shutdown ends a connection whose request never finishes after its timeout", async () => {
  const stuck = createBrowserServer({ shutdownTimeoutMs: 100 });
  await new Promise<void>((resolve) => stuck.listen(0, "127.0.0.1", resolve));
  const { port } = stuck.address() as AddressInfo;
  const socket = connect(port, "127.0.0.1");
  await once(socket, "connect");
  // The reply body never arrives.
  socket.write(
    "POST /rpc/local HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{",
  );
  await new Promise((resolve) => setTimeout(resolve, 50));
  const closed = new Promise<void>((resolve) => stuck.close(() => resolve()));
  await once(socket, "close");
  await closed;
}, 1_000);

test("rejects replies for another session and malformed results", async () => {
  const tab = await connectedTab();
  const other = await connectedTab("other");
  const call = setRegion();
  const command = await tab.command();
  expect((await other.reply(command.commandId, applied)).status).toBe(409);
  expect((await tab.reply(command.commandId, { ok: true, state: {}, value: {} })).status).toBe(400);
  await tab.reply(command.commandId, applied);
  expect((await call).isError).toBeFalsy();
});

test("rejects foreign origins, malformed JSON, invalid session IDs, and large replies", async () => {
  expect(
    (await fetch(`${base}/local`, { headers: { Origin: "https://untrusted.example" } })).status,
  ).toBe(403);
  expect((await fetch(`${base}/local`, { method: "POST", body: "{" })).status).toBe(400);
  expect((await fetch(`${base}/bad%20id`)).status).toBe(400);
  const large = { ok: false, code: "LARGE", error: "x".repeat(1_048_576) };
  expect(
    (await send("POST", "/local", { commandId: crypto.randomUUID(), result: large })).status,
  ).toBe(413);
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
  const response = await getWithHost("/rpc/local", host);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Host is not allowed" });
});

test("starts without a database or credentials", async () => {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["src/main.ts"], {
    env: { PATH: process.env.PATH, GB_SERVER_PORT: String(port) },
    stdio: ["ignore", "pipe", "inherit"],
  });
  try {
    const [line] = await once(child.stdout, "data");
    expect(String(line)).toContain(`listening at http://127.0.0.1:${port}`);
    expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200);
  } finally {
    child.kill();
  }
});

test("one SIGTERM stops the process while a tab is connected and a command is pending", async () => {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["src/main.ts"], {
    env: { PATH: process.env.PATH, GB_SERVER_PORT: String(port) },
    stdio: ["ignore", "pipe", "ignore"],
  });
  const exited = once(child, "exit");
  const local = new Client({ name: "shutdown-agent", version: "0.0.0" });
  try {
    await once(child.stdout, "data");
    const stream = await fetch(`http://127.0.0.1:${port}/rpc/local`);
    const reader = stream.body!.getReader();
    await local.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
    const call = local.callTool({ name: "set_region", arguments: { sessionId: "local", region } });
    while (!new TextDecoder().decode((await reader.read()).value).includes("event: command"));
    child.kill("SIGTERM");
    expect(JSON.stringify((await call).content)).toContain("NOT_CONNECTED");
    const [code] = await exited;
    expect(code).toBe(0);
  } finally {
    child.kill("SIGKILL");
  }
  // Well before the client's keep-alive or the server's shutdown timeout would end it.
}, 2_000);

test("local startup rejects a public bind address", () => {
  const result = spawnSync(process.execPath, ["src/main.ts"], {
    env: { ...process.env, GB_SERVER_HOST: "0.0.0.0" },
    encoding: "utf8",
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("GB_SERVER_HOST must be localhost, 127.0.0.1, or ::1");
});
