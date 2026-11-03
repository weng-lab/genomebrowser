import { AsyncLocalStorage } from "node:async_hooks";
import { generateKeyPairSync, sign } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { createTestDatabase, snapshot } from "./sessionFixtures";

// Only Next's request context is adapted: Clerk verification, the proxy,
// authorization route, session ownership and account settings are real.
const requestHeaders = new AsyncLocalStorage<Headers>();
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.getStore() ?? new Headers(),
  cookies: async () => {
    throw new Error("Clerk must resolve the request through its proxy");
  },
}));
const require = createRequire(import.meta.url);
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = { exports: {} } as NodeJS.Module;

export async function startAgentAuthorizationServer() {
  const key = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const frontendApi = "clerk.example.test";
  vi.stubEnv("GB_IDENTITY", "clerk");
  vi.stubEnv("NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED", "1");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", `pk_test_${btoa(`${frontendApi}$`)}`);
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_offline");
  vi.stubEnv("CLERK_JWT_KEY", key.publicKey.export({ type: "spki", format: "pem" }).toString());
  const database = await createTestDatabase();
  vi.stubEnv("DATABASE_URL", database.url);
  const { proxy } = await import("../proxy");
  const { GET } = await import("../app/api/sessions/[id]/agent-auth/route");
  const { POST: mcp } = await import("../app/api/mcp/route");
  const { getCommandRelay } = await import("../features/agent/commands/server/relay");
  vi.stubEnv("REDIS_URL", process.env.GB_TEST_REDIS_URL ?? "redis://127.0.0.1:6379");
  vi.stubEnv("GB_AGENT_NAMESPACE", `test-${crypto.randomUUID()}`);
  const { getSessions, getAccountSettings } = await import("../composition/server");

  function token(userId: string) {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
      sub: userId,
      sid: `sess_${userId}`,
      iss: `https://${frontendApi}`,
      iat: now,
      nbf: now - 5,
      exp: now + 600,
      azp: "https://browser.test:8443",
    })}`;
    return `${payload}.${sign("sha256", Buffer.from(payload), key.privateKey).toString("base64url")}`;
  }

  async function authenticated<T>(request: NextRequest, operation: () => Promise<T>) {
    const response = await proxy(
      request,
      new NextFetchEvent({ request, page: request.nextUrl.pathname, context: undefined }),
    );
    const forwarded =
      response?.headers.get("x-middleware-override-headers")?.split(",").filter(Boolean) ?? [];
    const headers = new Headers(
      forwarded.map((name) => [name, response!.headers.get(`x-middleware-request-${name}`)!]),
    );
    return requestHeaders.run(headers, operation);
  }
  function asUser<T>(userId: string, operation: () => Promise<T>) {
    return authenticated(
      new NextRequest("http://localhost/api/sessions", {
        headers: { authorization: `Bearer ${token(userId)}` },
      }),
      operation,
    );
  }

  const server = createServer((incoming, outgoing) => {
    const handle = async () => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (typeof value === "string") headers.set(name, value);
      }
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const abort = new AbortController();
      outgoing.on("close", () => abort.abort());
      const request = new NextRequest(`http://${incoming.headers.host}${incoming.url}`, {
        signal: abort.signal,
        headers,
        method: incoming.method,
        ...(chunks.length && { body: Buffer.concat(chunks) }),
      });
      const id = request.nextUrl.pathname.split("/")[3];
      const response = await authenticated(request, () =>
        request.nextUrl.pathname === "/api/mcp"
          ? mcp(request)
          : GET(request, { params: Promise.resolve({ id }) }),
      );
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(await response.text());
    };
    handle().catch((error: unknown) => {
      console.error(error);
      outgoing.writeHead(500);
      outgoing.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing auth server address");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    token,
    cookie: (userId: string) =>
      `__session=${token(userId)}; __client_uat=${Math.floor(Date.now() / 1000) - 10}; __clerk_db_jwt=development-browser`,
    createSession: (userId: string) =>
      asUser(userId, async () =>
        (await getSessions()).create({ name: "Agent auth", snapshot: snapshot() }),
      ),
    removeSession: (userId: string, id: string) =>
      asUser(userId, async () => (await getSessions()).remove(id)),
    setEnabled: (userId: string, enabled: boolean) =>
      asUser(userId, async () =>
        (await getAccountSettings()).update({ remoteControlEnabled: enabled }),
      ),
    async close() {
      await getCommandRelay().close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await database.drop();
    },
  };
}
