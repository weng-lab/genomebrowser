import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// Import first: it configures Clerk offline before the app's server modules load.
import { signIn } from "./clerkServer";
import { createTestDatabase, testServerUrl } from "./sessionFixtures";

// The proxy, Clerk verification, route handlers, settings operations, and PostgreSQL
// are real; Clerk users sign in with locally signed session tokens.
const route = await import("../app/api/account/settings/route");
const preferencesRoute = await import("../app/api/account/agent-preferences/route");

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

const readPreferences = async () => {
  const response = await preferencesRoute.GET();
  return { status: response.status, body: await response.json() };
};
const savePreferences = async (body: unknown) => {
  const response = await preferencesRoute.PUT(
    new Request("http://localhost/api/account/agent-preferences", {
      method: "PUT",
      body: JSON.stringify(body),
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

  it("keeps each account's agent preferences apart from its other settings", async () => {
    await signIn("user_carol");
    expect(await readPreferences()).toEqual({ status: 200, body: { text: "" } });
    expect(await savePreferences({ text: "  Use hg38. Keep answers short.  " })).toEqual({
      status: 200,
      body: { text: "Use hg38. Keep answers short." },
    });
    // Saving Remote Control leaves the preferences alone, and the reverse.
    expect(await save({ remoteControl: false })).toMatchObject({ status: 200 });
    expect(await readPreferences()).toMatchObject({
      body: { text: "Use hg38. Keep answers short." },
    });
    expect(await read()).toMatchObject({ body: { remoteControl: false } });

    await signIn("user_dave");
    expect(await readPreferences()).toMatchObject({ body: { text: "" } });
    expect(await savePreferences({ text: "x".repeat(1_001) })).toMatchObject({ status: 400 });
    expect(await savePreferences({ text: "ok", userId: "user_carol" })).toMatchObject({
      status: 400,
    });
    await signIn("user_carol");
    expect(await readPreferences()).toMatchObject({
      body: { text: "Use hg38. Keep answers short." },
    });
  });
});
