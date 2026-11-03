import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// Import first: it configures Clerk offline before the app's server modules load.
import { signIn } from "./clerkServer";
import { createTestDatabase, testServerUrl } from "./sessionFixtures";

// The proxy, Clerk verification, route handlers, settings operations, and PostgreSQL
// are real; Clerk users sign in with locally signed session tokens.
const route = await import("../app/api/account/settings/route");

const read = async () => {
  const response = await route.GET();
  return { status: response.status, body: await response.json() };
};
const save = async (body: unknown) => {
  const response = await route.PUT(
    new Request("http://localhost/api/account/settings", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
};

describe.skipIf(!testServerUrl)("account settings route", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    database = await createTestDatabase();
    vi.stubEnv("DATABASE_URL", database.url);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await database?.drop();
  });

  it("allows remote control for new accounts and keeps each account's choice", async () => {
    await signIn("user_alice");
    expect(await read()).toEqual({ status: 200, body: { remoteControl: true } });
    expect(await save({ remoteControl: false })).toEqual({
      status: 200,
      body: { remoteControl: false },
    });

    await signIn("user_bob");
    expect(await read()).toEqual({ status: 200, body: { remoteControl: true } });

    // A later request, as after reloading or signing in again.
    await signIn("user_alice");
    expect(await read()).toEqual({ status: 200, body: { remoteControl: false } });
    expect(await save({ remoteControl: true })).toMatchObject({ body: { remoteControl: true } });
    expect(await read()).toMatchObject({ body: { remoteControl: true } });
  });

  it("rejects signed-out requests, invalid settings, and a named account", async () => {
    await signIn(null);
    expect(await read()).toMatchObject({ status: 401, body: { code: "UNAUTHENTICATED" } });
    expect(await save({ remoteControl: false })).toMatchObject({ status: 401 });

    await signIn("user_bob");
    for (const body of [
      { remoteControl: "no" },
      { remoteControl: false, userId: "user_alice" },
      "{not json",
      { remoteControl: false, padding: "x".repeat(1024) },
    ])
      expect(await save(body)).toMatchObject({ status: 400, body: { code: "INVALID_INPUT" } });

    // Nothing rejected was saved.
    expect(await read()).toMatchObject({ body: { remoteControl: true } });
  });
});
