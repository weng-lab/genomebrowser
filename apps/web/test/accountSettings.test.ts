import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, testServerUrl } from "./sessionFixtures";

let user = "mock_user_1";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: user }) }) }));
vi.stubEnv("GB_IDENTITY", "mock");
const settings = await import("../app/api/account/settings/route");
const commands = await import("../app/api/sessions/[id]/commands/route");
const write = (body: unknown) =>
  settings.PUT(
    new Request("http://localhost/api/account/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  );

describe.skipIf(!testServerUrl)("account settings routes", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  beforeAll(async () => {
    database = await createTestDatabase();
    vi.stubEnv("DATABASE_URL", database.url);
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await database?.drop();
  });

  it("persists RC per user, defaults on, and rejects disabled command connections", async () => {
    expect(await (await settings.GET()).json()).toEqual({ remoteControlEnabled: true });
    expect((await write({ remoteControlEnabled: false })).status).toBe(200);
    expect(await (await settings.GET()).json()).toEqual({ remoteControlEnabled: false });
    const response = await commands.GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: crypto.randomUUID() }),
    });
    expect(response.status).toBe(403);
    user = "mock_user_2";
    expect(await (await settings.GET()).json()).toEqual({ remoteControlEnabled: true });
    user = "mock_user_1";
    expect(await (await settings.GET()).json()).toEqual({ remoteControlEnabled: false });
  });

  it("rejects unsigned callers, invalid settings, and client-selected owners", async () => {
    expect((await write({ remoteControlEnabled: "yes" })).status).toBe(400);
    expect((await write({ remoteControlEnabled: true, userId: "mock_user_2" })).status).toBe(400);
    user = "signed-out";
    expect((await settings.GET()).status).toBe(401);
    expect((await write({ remoteControlEnabled: true })).status).toBe(401);
  });
});
