import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

// The route handlers, mock identity, session operations, and PostgreSQL are real.
// The `next/headers` mock supplies each request's cookies, as Next does for a route.
let user: string | undefined = "mock_user_1";
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "gb_mock_user" && user ? { value: user } : undefined),
  }),
}));
vi.stubEnv("GB_IDENTITY", "mock");

const collection = await import("../app/api/sessions/route");
const single = await import("../app/api/sessions/[id]/route");

function as(next: string | undefined) {
  user = next;
}
function body(value: unknown, init: RequestInit = {}) {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    body: typeof value === "string" ? value : JSON.stringify(value),
    ...init,
  });
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}
const create = (value: unknown) => collection.POST(body(value));
const load = (id: string) => single.GET(new Request("http://localhost"), params(id));
const update = (id: string, value: unknown) =>
  single.PUT(body(value, { method: "PUT" }), params(id));
const remove = (id: string) => single.DELETE(new Request("http://localhost"), params(id));

describe.skipIf(!testServerUrl)("session routes", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    database = await createTestDatabase();
    vi.stubEnv("DATABASE_URL", database.url);
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await database?.drop();
  });

  it("creates, lists, loads, saves, and deletes the acting user's sessions", async () => {
    as("mock_user_1");
    const created = await create({ name: "Promoter scan", snapshot: snapshot() });
    expect(created.status).toBe(200);
    expect(created.headers.get("cache-control")).toBe("no-store");
    const session = await created.json();
    expect(session).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: "Promoter scan",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(await (await collection.GET()).json()).toEqual([session]);
    expect(await (await load(session.id)).json()).toEqual({ ...session, snapshot: snapshot() });

    const edited = snapshot({ region: { chromosome: "chr3", start: 10, end: 20 } });
    const saved = await update(session.id, { name: "Renamed", snapshot: edited });
    expect(saved.status).toBe(200);
    expect(await (await load(session.id)).json()).toMatchObject({
      name: "Renamed",
      snapshot: edited,
    });

    expect((await remove(session.id)).status).toBe(204);
    const missing = await update(session.id, { name: "Renamed", snapshot: edited });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: "NOT_FOUND", message: "Session not found" });
    expect(await (await collection.GET()).json()).toEqual([]);
  });

  it("keeps each user's sessions private and rejects signed-out requests", async () => {
    as("mock_user_1");
    const { id } = await (await create({ name: "Private", snapshot: snapshot() })).json();

    as("mock_user_2");
    expect(await (await collection.GET()).json()).toEqual([]);
    for (const response of [
      await load(id),
      await update(id, { name: "Taken", snapshot: snapshot() }),
      await remove(id),
    ])
      expect(response.status).toBe(404);

    as("someone_else");
    const signedOut = await collection.GET();
    expect(signedOut.status).toBe(401);
    expect(await signedOut.json()).toMatchObject({ code: "UNAUTHENTICATED" });

    as("mock_user_1");
    expect(await (await load(id)).json()).toMatchObject({ name: "Private" });
  });

  it("rejects an owner in the request, invalid bodies, oversized bodies, and assembly changes", async () => {
    as("mock_user_1");
    const owned = await create({ name: "Mine", owner: "mock_user_2", snapshot: snapshot() });
    expect(owned.status).toBe(400);
    expect(await owned.json()).toMatchObject({ code: "INVALID_INPUT" });
    expect((await create("{not json")).status).toBe(400);
    expect((await create({ name: " ", snapshot: snapshot() })).status).toBe(400);

    const large = { name: "Large", snapshot: snapshot(), padding: "x".repeat(1_000_001) };
    const declared = await collection.POST(
      body(large, { headers: { "Content-Length": String(JSON.stringify(large).length) } }),
    );
    expect(declared.status).toBe(400);
    expect(await declared.json()).toEqual({
      code: "INVALID_INPUT",
      message: "Sessions are limited to 1 MB",
    });
    // A streamed body has no declared length; its size is counted as it arrives.
    const bytes = new TextEncoder().encode(JSON.stringify(large));
    const streamed = await collection.POST(
      new Request("http://localhost/api/sessions", {
        method: "POST",
        body: new ReadableStream({
          start(controller) {
            for (let start = 0; start < bytes.length; start += 65_536)
              controller.enqueue(bytes.slice(start, start + 65_536));
            controller.close();
          },
        }),
        duplex: "half",
      } as RequestInit),
    );
    expect(await streamed.json()).toMatchObject({ message: "Sessions are limited to 1 MB" });

    const { id } = await (await create({ name: "Human", snapshot: snapshot() })).json();
    const changed = await update(id, {
      name: "Human",
      snapshot: snapshot({ assembly: "mm10" }),
    });
    expect(changed.status).toBe(409);
    expect(await changed.json()).toMatchObject({ code: "ASSEMBLY_CHANGED" });
    expect((await load("not-a-uuid")).status).toBe(404);
  });
});
