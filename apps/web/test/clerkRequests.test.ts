import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { createRequire } from "node:module";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

// Requests pass through the real proxy and Clerk's real `auth()` into `getSessions()`.
// Clerk verifies session tokens offline with `CLERK_JWT_KEY`, so no Clerk instance is needed.
// Next forwards the proxy's request headers to the route; the `next/headers` mock stands in for that step.
let routeHeaders = new Headers();
vi.mock("next/headers", () => ({
  headers: async () => routeHeaders,
  cookies: async () => {
    throw new Error("Clerk identity does not read cookies directly");
  },
}));

// Clerk's `auth()` requires `server-only` directly, past the Vitest alias. Next resolves it to an empty module.
const require = createRequire(import.meta.url);
const serverOnly = require.resolve("server-only");
require.cache[serverOnly] = { exports: {} } as NodeJS.Module;

const clerkKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const frontendApi = "clerk.example.test";
vi.stubGlobal("fetch", () => Promise.reject(new Error("Clerk must not reach the network")));
vi.stubEnv("GB_IDENTITY", undefined);
vi.stubEnv("NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED", "1");
vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", `pk_test_${btoa(`${frontendApi}$`)}`);
vi.stubEnv("CLERK_SECRET_KEY", "sk_test_offline");
vi.stubEnv("CLERK_JWT_KEY", clerkKey.publicKey.export({ type: "spki", format: "pem" }).toString());

// Clerk reads its keys when first imported.
const { proxy } = await import("../proxy");
const { getSessions } = await import("../server/composition");

function sessionToken(userId: string, key: KeyObject = clerkKey.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const claims = {
    sub: userId,
    sid: `sess_${userId}`,
    iss: `https://${frontendApi}`,
    iat: now,
    nbf: now - 5,
    exp: now + 60,
  };
  const content = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}`;
  return `${content}.${sign("sha256", Buffer.from(content), key).toString("base64url")}`;
}

/** Runs the proxy for a request, then returns the operations its route would call. */
async function sessionsFor(token?: string) {
  const request = new NextRequest("http://localhost/browser", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const response = await proxy(
    request,
    new NextFetchEvent({ request, page: "/browser", context: undefined }),
  );
  const forwarded =
    response?.headers.get("x-middleware-override-headers")?.split(",").filter(Boolean) ?? [];
  routeHeaders = new Headers(
    forwarded.map((name) => [name, response!.headers.get(`x-middleware-request-${name}`)!]),
  );
  return getSessions();
}

describe.skipIf(!testServerUrl)("Clerk requests", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    database = await createTestDatabase();
    vi.stubEnv("DATABASE_URL", database.url);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await database?.drop();
  });

  it("acts as the signed-in Clerk user", async () => {
    const alice = await sessionsFor(sessionToken("user_alice"));
    const saved = await alice.create({ name: "Clerk session", snapshot: snapshot() });
    expect(await alice.list()).toEqual([saved]);

    const bob = await sessionsFor(sessionToken("user_bob"));
    expect(await bob.list()).toEqual([]);
    await expect(bob.load(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects signed-out and forged requests", async () => {
    const forged = sessionToken(
      "user_alice",
      generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey,
    );

    await expect((await sessionsFor()).list()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await expect((await sessionsFor(forged)).list()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("skips Clerk only for mock identity outside production", async () => {
    const request = new NextRequest("http://localhost/browser");
    const event = new NextFetchEvent({ request, page: "/browser", context: undefined });
    vi.stubEnv("GB_IDENTITY", "mock");
    try {
      const response = await proxy(request, event);
      expect(response?.headers.get("x-middleware-request-x-clerk-auth-status")).toBeNull();
      vi.stubEnv("NODE_ENV", "production");
      expect(() => proxy(request, event)).toThrow("Mock identity is unavailable in production");
    } finally {
      vi.stubEnv("GB_IDENTITY", undefined);
      vi.stubEnv("NODE_ENV", "test");
    }
  });

  it("fails clearly when a route is outside the proxy", async () => {
    routeHeaders = new Headers();
    await expect(getSessions().list()).rejects.toThrow("can't detect usage of clerkMiddleware()");
  });
});
