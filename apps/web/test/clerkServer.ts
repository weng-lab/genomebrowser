import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { createRequire } from "node:module";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { NextRequest } from "next/server";
import { vi } from "vitest";

// Import this before the app's server modules. Requests then pass through the real
// proxy and Clerk's real `auth()`, with session tokens signed by a local key that
// Clerk verifies offline through `CLERK_JWT_KEY`. No Clerk instance or network is used.
// Next forwards the proxy's request headers to the route; the `next/headers` mock
// stands in for that step.
const route = vi.hoisted(() => ({ headers: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => route.headers,
  cookies: async () => {
    throw new Error("Clerk identity does not read cookies directly");
  },
}));

// Clerk's `auth()` requires `server-only` directly, past the Vitest alias. Next resolves it to an empty module.
const require = createRequire(import.meta.url);
require.cache[require.resolve("server-only")] = { exports: {} } as NodeJS.Module;

const clerkKey = generateKeyPairSync("rsa", { modulusLength: 2048 });
const frontendApi = "clerk.example.test";
vi.stubGlobal("fetch", () => Promise.reject(new Error("Clerk must not reach the network")));
vi.stubEnv("NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED", "1");
vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", `pk_test_${btoa(`${frontendApi}$`)}`);
vi.stubEnv("CLERK_SECRET_KEY", "sk_test_offline");
vi.stubEnv("CLERK_JWT_KEY", clerkKey.publicKey.export({ type: "spki", format: "pem" }).toString());

// Clerk reads its keys when first imported.
const { proxy } = await import("../proxy");

/** A Clerk session token for `userId`, signed by the test instance unless `key` forges it. */
export function sessionToken(userId: string, key: KeyObject = clerkKey.privateKey) {
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

/**
 * Sends a request through the proxy with `token`, or signed out without one, and
 * makes the route handlers called next see the proxy's result.
 */
export async function authenticate(token?: string) {
  const request = new NextRequest("http://localhost/api/sessions", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const response = await proxy(
    request,
    new NextFetchEvent({ request, page: "/api/sessions", context: undefined }),
  );
  const forwarded =
    response?.headers.get("x-middleware-override-headers")?.split(",").filter(Boolean) ?? [];
  route.headers = new Headers(
    forwarded.map((name) => [name, response!.headers.get(`x-middleware-request-${name}`)!]),
  );
}

/** Act as the Clerk user `userId`, or as signed out for `null`. */
export const signIn = (userId: string | null) =>
  authenticate(userId ? sessionToken(userId) : undefined);

/** Route handlers called next run as if the proxy had not handled their request. */
export function bypassProxy() {
  route.headers = new Headers();
}

export { proxy };
