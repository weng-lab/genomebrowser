import { generateKeyPairSync } from "node:crypto";
import { NextFetchEvent } from "next/dist/server/web/spec-extension/fetch-event";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// Import first: it configures Clerk offline before the app's server modules load.
import { authenticate, bypassProxy, proxy, sessionToken, signIn } from "./clerkServer";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

const { getSessions } = await import("../composition/server");

describe("Clerk configuration", () => {
  it.each(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"])(
    "refuses requests without %s rather than starting keyless Clerk",
    (name) => {
      const request = new NextRequest("http://localhost/browser");
      const event = new NextFetchEvent({ request, page: "/browser", context: undefined });
      const key = process.env[name];
      vi.stubEnv(name, undefined);
      try {
        expect(() => proxy(request, event)).toThrow(`${name} must be set`);
      } finally {
        vi.stubEnv(name, key);
      }
    },
  );
});

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
    await signIn("user_alice");
    const alice = await getSessions();
    const saved = await alice.create({ name: "Clerk session", snapshot: snapshot() });
    expect(await alice.list()).toEqual([saved]);

    await signIn("user_bob");
    const bob = await getSessions();
    expect(await bob.list()).toEqual([]);
    await expect(bob.load(saved.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects signed-out and forged requests", async () => {
    await signIn(null);
    await expect((await getSessions()).list()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    const forger = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    await authenticate(sessionToken("user_alice", forger));
    await expect((await getSessions()).list()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("fails clearly when a route is outside the proxy", async () => {
    bypassProxy();
    await expect((await getSessions()).list()).rejects.toThrow(
      "can't detect usage of clerkMiddleware()",
    );
  });
});
