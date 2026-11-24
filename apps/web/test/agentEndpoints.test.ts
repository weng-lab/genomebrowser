import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// Import first: it configures Clerk offline before the app's server modules load.
import { authenticate, sessionToken, signIn } from "./clerkServer";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { readCommandStream, testRedisUrl } from "./redis";
import { commands as agentCommands } from "../features/agent/commands";
import { addTracksFromUrls } from "../features/agent/commands/addTracksFromUrls";
import { issueBindProof, issueCommandCredential } from "../features/agent/server/credential";
import { createTestDatabase, snapshot, testServerUrl } from "./sessionFixtures";

// The proxy, Clerk verification, route handlers, authorization, PostgreSQL, and
// Redis are real. An MCP client calls the MCP route; a tab is a reader of the
// commands route's stream that replies through the same route, as the browser does.

const mcp = await import("../app/api/mcp/route");
const agentAuth = await import("../app/api/sessions/[id]/agent-auth/route");
const agentThread = await import("../app/api/sessions/[id]/agent-thread/route");
const agentContext = await import("../app/api/sessions/[id]/agent-context/route");
const commands = await import("../app/api/sessions/[id]/commands/route");
const sessions = await import("../app/api/sessions/route");
const sessionById = await import("../app/api/sessions/[id]/route");
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
    expect(tools.map(({ name }) => name).sort()).toEqual(
      agentCommands.map(({ name }) => name).sort(),
    );
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
    // The reply was consumed. The relay stops listening in the background, so a
    // repeated reply may still reach it at first.
    await vi.waitFor(async () =>
      expect(
        await reply("user_alice", id, {
          commandId: command.commandId,
          result: { ok: true, value },
        }),
      ).toMatchObject({ status: 409 }),
    );

    tab.close();
    await client.close();
  });

  it("gives a tool call its command's time limit, which the MCP route outlasts", async () => {
    const id = await createSession("user_alice");
    const tab = await openTab("user_alice", id);
    if (!("command" in tab)) throw new Error(`Tab was refused: ${tab.status}`);
    const client = await agent("user_alice");
    const limit = addTracksFromUrls.timeoutMs!;
    const started = Date.now();

    const call = client.callTool({
      name: "add_tracks_from_urls",
      arguments: { sessionId: id, tracks: [{ url: "https://data.example.test/signal.bw" }] },
    });
    const command = await tab.command();
    expect(command.expiresAt).toBeGreaterThanOrEqual(started + limit);
    expect(command.expiresAt).toBeLessThanOrEqual(Date.now() + limit);
    const value = { tracks: [] };
    await reply("user_alice", id, { commandId: command.commandId, result: { ok: true, value } });
    expect(await call).toMatchObject({ structuredContent: value });
    for (const { timeoutMs = 5_000 } of agentCommands)
      expect(timeoutMs / 1_000).toBeLessThan(mcp.maxDuration);

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

  it("authorizes embedded agent sessions and their threads, letting Stop run after RC off", async () => {
    const id = await createSession("user_alice");
    const auth = (query = "") =>
      agentAuth.GET(
        new Request(`http://localhost/api/sessions/${id}/agent-auth${query}`),
        params(id),
      );
    const thread = `http://localhost/api/sessions/${id}/agent-thread`;
    /** Record `conversationId` with `proof`, by default a valid proof from Eve. */
    const bind = async (conversationId: string, proof?: string | null) => {
      const token =
        proof === undefined ? await issueBindProof("user_alice", id, conversationId) : proof;
      return agentThread.POST(
        new Request(thread, {
          method: "POST",
          headers: token ? { "x-genomebrowser-bind-proof": token } : {},
          body: JSON.stringify({ conversationId }),
        }),
        params(id),
      );
    };

    await signIn(null);
    expect((await auth()).status).toBe(401);
    await signIn("user_bob");
    expect((await auth()).status).toBe(404);
    expect((await bind("conversation-bob")).status).toBe(404);

    await signIn("user_alice");
    const allowed = await auth();
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ userId: "user_alice", browserSessionId: id });
    expect(await (await agentThread.GET(new Request(thread), params(id))).json()).toEqual({
      conversationId: null,
    });
    // Stop and follow-ups must name the session's thread.
    expect((await auth("?control=stop")).status).toBe(403);
    expect((await auth("?conversation=conversation-a")).status).toBe(403);

    // Only Eve's one-use proof for this user, session, and conversation records it.
    expect((await bind("conversation-a", null)).status).toBe(403);
    expect(
      (await bind("conversation-a", await issueBindProof("user_alice", id, "conversation-x")))
        .status,
    ).toBe(403);
    expect(
      (await bind("conversation-a", await issueBindProof("user_bob", id, "conversation-a"))).status,
    ).toBe(403);
    const proof = await issueBindProof("user_alice", id, "conversation-a");
    expect((await bind("conversation-a", proof)).status).toBe(200);
    expect((await bind("conversation-a", proof)).status).toBe(403);
    expect((await bind("conversation-a")).status).toBe(200);
    expect((await bind("conversation-b")).status).toBe(409);
    expect(await (await agentThread.GET(new Request(thread), params(id))).json()).toEqual({
      conversationId: "conversation-a",
    });
    expect((await auth("?conversation=conversation-a")).status).toBe(200);
    expect((await auth("?conversation=conversation-b")).status).toBe(403);

    // Another session of the same user cannot reach or take this thread.
    const other = await createSession("user_alice");
    expect(
      (
        await agentThread.POST(
          new Request(`http://localhost/api/sessions/${other}/agent-thread`, {
            method: "POST",
            headers: {
              "x-genomebrowser-bind-proof": await issueBindProof(
                "user_alice",
                other,
                "conversation-a",
              ),
            },
            body: JSON.stringify({ conversationId: "conversation-a" }),
          }),
          params(other),
        )
      ).status,
    ).not.toBe(200);
    expect(
      (
        await agentAuth.GET(
          new Request(
            `http://localhost/api/sessions/${other}/agent-auth?conversation=conversation-a`,
          ),
          params(other),
        )
      ).status,
    ).toBe(403);

    await setRemoteControl("user_alice", false);
    try {
      await signIn("user_alice");
      expect((await auth("?conversation=conversation-a")).status).toBe(403);
      expect((await auth("?control=stop&conversation=conversation-a")).status).toBe(200);
    } finally {
      await setRemoteControl("user_alice", true);
    }

    // Releasing a lost conversation lets the next message start a new thread.
    await signIn("user_alice");
    const release = (conversation: string) =>
      agentThread.DELETE(
        new Request(`${thread}?conversation=${conversation}`, { method: "DELETE" }),
        params(id),
      );
    expect((await release("conversation-b")).status).toBe(204);
    expect((await auth("?conversation=conversation-a")).status).toBe(200);
    expect((await release("conversation-a")).status).toBe(204);
    expect((await bind("conversation-b")).status).toBe(200);

    // Deleting the session ends its conversation in Eve, then deletes its thread. Eve's
    // route on the app's origin is stood in for: it records each request and answers.
    const offline = globalThis.fetch;
    const eve = { status: 503, body: {} as object, requests: [] as object[] };
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      eve.requests.push({
        method: request.method,
        url: request.url,
        session: request.headers.get("x-genomebrowser-session-id"),
      });
      return Response.json(eve.body, { status: eve.status });
    });
    try {
      const remove = () =>
        sessionById.DELETE(
          new Request(`http://localhost/api/sessions/${id}`, { method: "DELETE" }),
          params(id),
        );
      // While Eve cannot confirm the end, the session keeps its thread.
      expect((await remove()).status).toBe(500);
      expect((await auth("?conversation=conversation-b")).status).toBe(200);
      // A conversation Eve no longer holds active has nothing left to end.
      Object.assign(eve, { status: 409, body: { ok: false, code: "session_not_active" } });
      expect((await remove()).status).toBe(204);
      const end = {
        method: "POST",
        url: "http://localhost:3000/eve/v1/session/conversation-b/end",
        session: id,
      };
      expect(eve.requests).toEqual([end, end]);
    } finally {
      vi.stubGlobal("fetch", offline);
    }
    expect((await auth("?control=stop&conversation=conversation-b")).status).toBe(403);
    expect((await bind("conversation-c")).status).toBe(404);
  });

  it("gives Eve its session's facts only with that session's scoped credential", async () => {
    const id = await createSession("user_alice");
    const other = await createSession("user_alice");
    const context = (session: string, bearer?: string) =>
      agentContext.GET(
        new Request(`http://localhost/api/sessions/${session}/agent-context`, {
          headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
        }),
        params(session),
      );
    await signIn(null);
    expect((await context(id)).status).toBe(401);
    expect((await context(id, sessionToken("user_alice"))).status).toBe(401);
    const { token } = await issueCommandCredential("user_alice", id);
    expect((await context(other, token)).status).toBe(404);
    expect((await context(id, (await issueCommandCredential("user_bob", id)).token)).status).toBe(
      404,
    );
    const allowed = await context(id, token);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ sessionId: id, title: "Agent work", assembly: "hg38" });
    await setRemoteControl("user_alice", false);
    try {
      expect((await context(id, token)).status).toBe(403);
    } finally {
      await setRemoteControl("user_alice", true);
    }
  });

  it("accepts a scoped Eve credential only for its own session, namespace, and enabled RC", async () => {
    const id = await createSession("user_alice");
    const other = await createSession("user_alice");
    const { token } = await issueCommandCredential("user_alice", id);

    const connectWithToken = async (bearer: string) => {
      const client = new Client({ name: "eve-test", version: "0.0.0" });
      await client.connect(
        new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
          fetch: async (url, init) => {
            await authenticate();
            const headers = new Headers(init?.headers);
            headers.set("authorization", `Bearer ${bearer}`);
            return mcp.POST(new Request(url, { ...init, headers }));
          },
        }),
      );
      return client;
    };

    const client = await connectWithToken(token);
    expect(await client.callTool(navigate(other))).toMatchObject({
      isError: true,
      content: [{ text: expect.stringMatching(/^FORBIDDEN:/) }],
    });

    const tab = await openTab("user_alice", id);
    if (!("command" in tab)) throw new Error(`Tab was refused: ${tab.status}`);
    const call = client.callTool(navigate(id));
    const command = await tab.command();
    const value = { region: { chromosome: "chr1", start: 1000, end: 2000 }, clamped: false };
    await reply("user_alice", id, { commandId: command.commandId, result: { ok: true, value } });
    expect(await call).toMatchObject({ structuredContent: value });

    await setRemoteControl("user_alice", false);
    try {
      expect(await client.callTool(navigate(id))).toMatchObject({
        isError: true,
        content: [{ text: expect.stringMatching(/^REMOTE_CONTROL_DISABLED:/) }],
      });
    } finally {
      await setRemoteControl("user_alice", true);
    }
    tab.close();
    await client.close();

    // A credential issued in another deployment's namespace must be rejected.
    const previousDeployment = process.env.VERCEL_DEPLOYMENT_ID;
    let foreignToken: string;
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", `other-${crypto.randomUUID()}`);
    try {
      ({ token: foreignToken } = await issueCommandCredential("user_alice", id));
    } finally {
      vi.stubEnv("VERCEL_DEPLOYMENT_ID", previousDeployment ?? "");
    }
    await authenticate();
    const rejected = await mcp.POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { authorization: `Bearer ${foreignToken}` },
        body: "{}",
      }),
    );
    expect(rejected.status).toBe(401);
  });
});
