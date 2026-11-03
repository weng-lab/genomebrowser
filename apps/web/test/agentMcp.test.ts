import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { commands, runCommand } from "../features/agent/commands";
import { commandMessageSchema } from "../features/agent/commands/protocol";
import { createCommandRelay } from "../features/agent/commands/server/relay";
import { createStores } from "../features/assemblies/assemblies";
import { issueCommandCredential } from "../features/agent/server/credential";
import { testRedisUrl } from "./redis";
import { testServerUrl } from "./sessionFixtures";
import { startAgentAuthorizationServer } from "./agentAuthorizationServer";

// Real HTTP MCP, Clerk signature verification/proxy, Postgres, Redis and browser
// commands. The fixture adapts only Next's request context to a Node listener.
describe.skipIf(!testRedisUrl || !testServerUrl)("Genomebrowser MCP", () => {
  let app: Awaited<ReturnType<typeof startAgentAuthorizationServer>>;
  const clients: Client[] = [];
  let sessionId: string;
  beforeAll(async () => {
    app = await startAgentAuthorizationServer();
    sessionId = (await app.createSession("user_alice")).id;
  });
  afterAll(async () => {
    await Promise.all(clients.map((client) => client.close()));
    await app?.close();
  });
  async function connect(token: string, modern = false) {
    const client = new Client(
      { name: "external-agent-test", version: "1.0.0" },
      { versionNegotiation: { mode: modern ? "auto" : "legacy" } },
    );
    clients.push(client);
    await client.connect(
      new StreamableHTTPClientTransport(new URL("/api/mcp", app.origin), {
        requestInit: { headers: { authorization: `Bearer ${token}` } },
      }),
    );
    return client;
  }
  const region = { chromosome: "chr1", start: 1000, end: 2000 };

  it("challenges anonymous/forged credentials with OAuth discovery", async () => {
    for (const token of ["", "forged"]) {
      const response = await fetch(`${app.origin}/api/mcp`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain(
        "/.well-known/oauth-protected-resource/api/mcp",
      );
    }
  });

  it("publishes public OAuth metadata for the exact MCP resource", async () => {
    const { GET } = await import("../app/.well-known/oauth-protected-resource/api/mcp/route");
    const response = GET(new Request(`${app.origin}/.well-known/oauth-protected-resource/api/mcp`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      resource: `${app.origin}/api/mcp`,
      authorization_servers: ["https://clerk.example.test"],
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("refuses an Eve credential issued by another preview", async () => {
    const namespace = process.env.GB_AGENT_NAMESPACE!;
    let token: string;
    vi.stubEnv("GB_AGENT_NAMESPACE", `${namespace}-other-preview`);
    try {
      ({ token } = await issueCommandCredential("user_alice", sessionId));
    } finally {
      vi.stubEnv("GB_AGENT_NAMESPACE", namespace);
    }
    const response = await fetch(`${app.origin}/api/mcp`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
  });

  it("publishes every command automatically and lets an external agent mutate the connected browser", async () => {
    const client = await connect(app.token("user_alice"));
    expect((await client.listTools()).tools.map(({ name }) => name).sort()).toEqual(
      commands.map(({ name }) => name).sort(),
    );
    const relay = createCommandRelay({ url: testRedisUrl! });
    const lifetime = new AbortController();
    const stream = await relay.connect(sessionId, crypto.randomUUID(), lifetime.signal);
    const reader = stream!.pipeThrough(new TextDecoderStream()).getReader();
    const stores = createStores("hg38")!;
    try {
      const pending = client.callTool({ name: "set_region", arguments: { sessionId, region } });
      let buffer = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("Disconnected before delivery");
        buffer += chunk.value;
        const match = /event: command\ndata: ([^\n]+)\n\n/.exec(buffer);
        if (!match) continue;
        const message = commandMessageSchema.parse(JSON.parse(match[1]));
        const result = await runCommand(
          {
            stores,
            exportImage: async () => {
              throw new Error("Not rendered");
            },
            showImage() {},
          },
          message,
          lifetime.signal,
        );
        await relay.acknowledge(sessionId, { commandId: message.commandId, result });
        break;
      }
      expect(await pending).toMatchObject({ structuredContent: { region, clamped: false } });
      expect(stores.useBrowserStore.getState().region).toEqual(region);
    } finally {
      lifetime.abort();
      await reader.cancel();
      await relay.close();
    }
  });

  it("enforces ownership, RC, and a scoped Eve credential through the same tools", async () => {
    const bob = await connect(app.token("user_bob"));
    expect(
      await bob.callTool({ name: "set_region", arguments: { sessionId, region } }),
    ).toMatchObject({ isError: true });
    const { token } = await issueCommandCredential("user_alice", sessionId);
    const eve = await connect(token);
    const other = (await app.createSession("user_alice")).id;
    const refused = await eve.callTool({
      name: "set_region",
      arguments: { sessionId: other, region },
    });
    expect(JSON.stringify(refused)).toContain("another session");
    await app.setEnabled("user_alice", false);
    try {
      const denied = await eve.callTool({ name: "set_region", arguments: { sessionId, region } });
      expect(denied.isError).toBe(true);
      expect(JSON.stringify(denied)).toContain("Remote control is disabled");
    } finally {
      await app.setEnabled("user_alice", true);
    }
  });

  it("cancels browser execution when an external client aborts its MCP request", async () => {
    const client = await connect(app.token("user_alice"), true);
    const relay = createCommandRelay({ url: testRedisUrl! });
    const lifetime = new AbortController();
    const stream = await relay.connect(sessionId, crypto.randomUUID(), lifetime.signal);
    const reader = stream!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    async function event() {
      for (;;) {
        const match = /event: (\w+)\ndata: ([^\n]+)\n\n/.exec(buffer);
        if (match) {
          buffer = buffer.slice(match.index + match[0].length);
          return { type: match[1], data: JSON.parse(match[2]) };
        }
        const chunk = await reader.read();
        if (chunk.done) throw new Error("Disconnected before cancellation");
        buffer += chunk.value;
      }
    }
    const abort = new AbortController();
    try {
      const pending = client
        .callTool(
          { name: "set_region", arguments: { sessionId, region } },
          { signal: abort.signal },
        )
        .then(
          () => "completed",
          () => "cancelled",
        );
      const delivered = await event();
      expect(delivered.type).toBe("command");
      abort.abort();
      expect(await pending).toBe("cancelled");
      expect(await event()).toMatchObject({
        type: "cancel",
        data: { commandId: delivered.data.commandId },
      });
    } finally {
      abort.abort();
      lifetime.abort();
      await reader.cancel();
      await relay.close();
    }
  });
});
