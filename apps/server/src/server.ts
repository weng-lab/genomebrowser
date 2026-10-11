import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { commandReplySchema, regionSchema, type CommandReply } from "./protocol.ts";

export type BrowserServerOptions = {
  apiToken: string;
  allowedOrigins?: readonly string[];
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
};
type Pending = { response: ServerResponse; timer: ReturnType<typeof setTimeout> };
type Client = { response: ServerResponse; resultToken: string; pending: Map<string, Pending> };

function authorized(request: IncomingMessage, token: string) {
  const actual = Buffer.from(request.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}
function readJson(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 16_384) {
        chunks.length = 0;
        reject(new Error("Request body exceeds 16 KB"));
      } else {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (size > 16_384) return;
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
    request.on("aborted", () => reject(new Error("Request aborted")));
  });
}

/** Owns connected streams and in-flight commands; never stores browser state or replays commands. */
export function createBrowserServer(options: BrowserServerOptions) {
  if (!options.apiToken.trim()) throw new Error("GB_API_TOKEN is required");
  const origins = options.allowedOrigins ?? ["http://localhost:3000", "http://127.0.0.1:3000"];
  for (const origin of origins) {
    if (new URL(origin).origin !== origin) throw new Error(`Invalid allowed origin: ${origin}`);
  }
  const clients = new Map<string, Client>();
  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) json(response, 400, { error: "Invalid JSON request" });
      else response.end();
    });
  });
  async function handle(request: IncomingMessage, response: ServerResponse) {
    if (request.headers.origin && !origins.includes(request.headers.origin)) {
      return json(response, 403, { error: "Origin is not allowed" });
    }
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (request.method === "GET" && path === "/health") return json(response, 200, { ok: true });
    if (request.method === "GET" && path === "/api/browser/events") {
      const clientId = randomUUID();
      const client: Client = {
        response,
        resultToken: randomBytes(32).toString("hex"),
        pending: new Map(),
      };
      clients.set(clientId, client);
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(
        `event: connected\ndata: ${JSON.stringify({ clientId, resultToken: client.resultToken })}\n\n`,
      );
      const heartbeat = setInterval(
        () => response.write(": heartbeat\n\n"),
        options.heartbeatIntervalMs ?? 15_000,
      );
      response.on("close", () => {
        clearInterval(heartbeat);
        clients.delete(clientId);
        for (const pending of client.pending.values()) {
          clearTimeout(pending.timer);
          json(pending.response, 409, { error: "Browser disconnected" });
        }
        client.pending.clear();
      });
      return;
    }
    if (request.method === "GET" && path === "/api/browser/clients") {
      if (!authorized(request, options.apiToken))
        return json(response, 401, { error: "Unauthorized" });
      return json(response, 200, {
        clients: [...clients.keys()].map((clientId) => ({ clientId })),
      });
    }
    const match = /^\/api\/browser\/clients\/([^/]+)\/(region|results)$/.exec(path);
    if (request.method !== "POST" || !match) return json(response, 404, { error: "Not found" });
    const [, clientId, operation] = match;
    const client = clients.get(clientId);
    if (operation === "region" && !authorized(request, options.apiToken))
      return json(response, 401, { error: "Unauthorized" });
    if (!client) return json(response, 404, { error: "Browser is not connected" });
    if (operation === "results") {
      if (!authorized(request, client.resultToken))
        return json(response, 401, { error: "Unauthorized" });
      const parsed = commandReplySchema.safeParse(await readJson(request));
      if (!parsed.success) return json(response, 400, { error: "Invalid command result" });
      const reply: CommandReply = parsed.data;
      const pending = client.pending.get(reply.commandId);
      if (!pending)
        return json(response, 409, { error: "Command is not pending for this browser" });
      clearTimeout(pending.timer);
      client.pending.delete(reply.commandId);
      json(pending.response, reply.result.ok ? 200 : 422, reply);
      return json(response, 200, { ok: true });
    }
    const parsed = regionSchema.safeParse(await readJson(request));
    if (!parsed.success) return json(response, 400, { error: "Invalid region" });
    if (clients.get(clientId) !== client)
      return json(response, 409, { error: "Browser disconnected" });
    if (response.destroyed) return;
    if (client.pending.size >= 32)
      return json(response, 429, { error: "Too many pending commands" });
    const commandId = randomUUID();
    const expiresAt = Date.now() + (options.commandTimeoutMs ?? 5_000);
    const timer = setTimeout(() => {
      client.pending.delete(commandId);
      json(response, 504, { commandId, error: "Browser command timed out" });
    }, options.commandTimeoutMs ?? 5_000);
    client.pending.set(commandId, { response, timer });
    response.on("close", () => {
      clearTimeout(timer);
      client.pending.delete(commandId);
    });
    client.response.write(
      `event: command\ndata: ${JSON.stringify({ commandId, type: "region.set", expiresAt, region: parsed.data })}\n\n`,
    );
  }
  // Closing the server also closes long-lived SSE streams so shutdown cannot hang.
  const close = server.close.bind(server);
  server.close = (callback) => {
    for (const client of clients.values()) client.response.end();
    return close(callback);
  };
  return server;
}
