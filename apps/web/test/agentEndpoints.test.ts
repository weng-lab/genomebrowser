import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// Import first: it configures Clerk offline before the app's server modules load.
import { authenticate, sessionToken, signIn } from "./clerkServer";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { readCommandStream, testRedisUrl } from "./redis";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

// The proxy, Clerk verification, route handlers, authorization, PostgreSQL, and
// Redis are real. An MCP client calls the MCP route; a tab is a reader of the
// commands route's stream that replies through the same route, as the browser does.

const mcp = await import("../app/api/mcp/route");
const commands = await import("../app/api/sessions/[id]/commands/route");
const sessions = await import("../app/api/sessions/route");
const settings = await import("../app/api/account/settings/route");

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function createSession(user: string) {
  await signIn(user);
  const response = await sessions.POST(
    new Request("http://localhost/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name: "Agent work", snapshot: snapshot() }),
    }),
  );
  return ((await response.json()) as { id: string }).id;
}

async function setRemoteControl(user: string, remoteControl: boolean) {
  await signIn(user);
  await settings.PUT(
    new Request("http://localhost/api/account/settings", {
      method: "PUT",
      body: JSON.stringify({ remoteControl }),
    }),
  );
}

/** Open the session's command stream as `user`'s tab. */
async function openTab(user: string | null, id: string, tabId: string = crypto.randomUUID()) {
  await signIn(user);
  const controller = new AbortController();
  const response = await commands.GET(
    new Request(`http://localhost/api/sessions/${id}/commands?tab=${tabId}`, {
      signal: controller.signal,
    }),
    params(id),
  );
  if (!response.ok) return { status: response.status, body: await response.json() };
  const close = () => controller.abort();
  return { status: response.status, ...readCommandStream(response.body!, close) };
}

async function reply(user: string, id: string, body: unknown) {
  await signIn(user);
  const response = await commands.POST(
    new Request(`http://localhost/api/sessions/${id}/commands`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params(id),
  );
  return { status: response.status, body: await response.json() };
}

/** An MCP client whose every request carries `user`'s Clerk session token. */
async function agent(user: string) {
  const client = new Client({ name: "test-agent", version: "0.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
      fetch: async (url, init) => {
        await authenticate(sessionToken(user));
        return mcp.POST(new Request(url, init));
      },
    }),
  );
  return client;
}

const navigate = (sessionId: string) => ({
  name: "set_region",
  arguments: { sessionId, region: { chromosome: "chr1", start: 1000, end: 2000 } },
});

describe.skipIf(!testServerUrl || !testRedisUrl)("agent endpoints", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeAll(async () => {
    database = await createTestDatabase();
    vi.stubEnv("DATABASE_URL", database.url);
    vi.stubEnv("REDIS_URL", testRedisUrl);
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", `test-${crypto.randomUUID()}`);
  });

  afterAll(async () => {
    const { getCommandRelay } = await import("../composition/server");
    await getCommandRelay().close();
    vi.unstubAllEnvs();
    await database?.drop();
  });

  it("refuses MCP requests without credentials or from another site", async () => {
    await authenticate();
    const anonymous = await mcp.POST(
      new Request("http://localhost/api/mcp", { method: "POST", body: "{}" }),
    );
    expect(anonymous.status).toBe(401);

    await authenticate(sessionToken("user_alice"));
    const crossSite = await mcp.POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { origin: "https://elsewhere.example" },
        body: "{}",
      }),
    );
    expect(crossSite.status).toBe(403);
  });

  it("publishes every command as a tool that names its session", async () => {
    const client = await agent("user_alice");
    const { tools } = await client.listTools();
    expect(tools.map(({ name }) => name).sort()).toEqual([
      "export_image",
      "set_region",
      "sort_tracks",
    ]);
    for (const tool of tools) expect(tool.inputSchema.required).toContain("sessionId");
    await client.close();
  });

  it("runs a tool call in the owner's tab and returns the tab's result", async () => {
    const id = await createSession("user_alice");
    const tab = await openTab("user_alice", id);
    if (!("command" in tab)) throw new Error(`Tab was refused: ${tab.status}`);
    const client = await agent("user_alice");

    const call = client.callTool(navigate(id));
    const command = await tab.command();
    expect(command).toMatchObject({
      name: "set_region",
      params: { region: { chromosome: "chr1", start: 1000, end: 2000 } },
    });
    const value = { region: { chromosome: "chr1", start: 1000, end: 2000 }, clamped: false };
    expect(
      await reply("user_alice", id, { commandId: command.commandId, result: { ok: true, value } }),
    ).toEqual({ status: 200, body: { ok: true } });
    expect(await call).toMatchObject({ structuredContent: value });
    // The reply was consumed.
    expect(
      await reply("user_alice", id, { commandId: command.commandId, result: { ok: true, value } }),
    ).toMatchObject({ status: 409 });

    tab.close();
    await client.close();
  });

  it("does not reach a tab for another user's session or with remote control off", async () => {
    const id = await createSession("user_alice");
    const tab = await openTab("user_alice", id);
    if (!("command" in tab)) throw new Error(`Tab was refused: ${tab.status}`);
    let reached = false;
    tab
      .next()
      .then(() => (reached = true))
      .catch(() => {});

    const bob = await agent("user_bob");
    expect(await bob.callTool(navigate(id))).toMatchObject({
      isError: true,
      content: [{ text: expect.stringMatching(/^NOT_FOUND:/) }],
    });
    await bob.close();

    await setRemoteControl("user_alice", false);
    const alice = await agent("user_alice");
    expect(await alice.callTool(navigate(id))).toMatchObject({
      isError: true,
      content: [{ text: expect.stringMatching(/^REMOTE_CONTROL_DISABLED:/) }],
    });
    await alice.close();
    await setRemoteControl("user_alice", true);

    expect(reached).toBe(false);
    tab.close();
  });

  it("reports a session no tab has open", async () => {
    const id = await createSession("user_alice");
    const client = await agent("user_alice");
    expect(await client.callTool(navigate(id))).toMatchObject({
      isError: true,
      content: [{ text: expect.stringMatching(/^NOT_CONNECTED:/) }],
    });
    await client.close();
  });

  it("lets only the owner attach a tab, one tab at a time, while remote control is on", async () => {
    const id = await createSession("user_alice");
    expect(await openTab(null, id)).toMatchObject({ status: 401 });
    expect(await openTab("user_bob", id)).toMatchObject({ status: 404 });
    expect(await openTab("user_alice", "not-a-session")).toMatchObject({ status: 404 });
    await signIn("user_alice");
    const invalid = await commands.GET(
      new Request(`http://localhost/api/sessions/${id}/commands?tab=nope`),
      params(id),
    );
    expect(invalid.status).toBe(400);

    await setRemoteControl("user_alice", false);
    expect(await openTab("user_alice", id)).toMatchObject({
      status: 403,
      body: { code: "REMOTE_CONTROL_DISABLED" },
    });
    await setRemoteControl("user_alice", true);

    const first = await openTab("user_alice", id);
    expect(first.status).toBe(200);
    expect(await openTab("user_alice", id)).toMatchObject({ status: 409 });
    if ("close" in first) first.close();
  });

  it("accepts replies only from the session's owner", async () => {
    const id = await createSession("user_alice");
    const commandId = crypto.randomUUID();
    const result = { ok: true, value: null };
    expect(await reply("user_bob", id, { commandId, result })).toMatchObject({ status: 404 });
    expect(await reply("user_alice", id, { commandId, result })).toMatchObject({ status: 409 });
    expect(await reply("user_alice", id, { commandId: "nope", result })).toMatchObject({
      status: 400,
    });
  });
});
