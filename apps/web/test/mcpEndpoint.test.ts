import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, it } from "vitest";
import { commands } from "../features/agent/commands";
import type { AgentAccount } from "../features/agent/server/access";
import { createMcpEndpoint } from "../features/mcp/server/mcp";

// The endpoint resolves the account, session service, and relay only for a tool call,
// so missing configuration fails that call as UNAVAILABLE instead of every MCP request.
async function connect(dependencies: Parameters<typeof createMcpEndpoint>[0]) {
  const endpoint = createMcpEndpoint(dependencies);
  const client = new Client({ name: "test-agent", version: "0.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
      fetch: (url, init) => endpoint.fetch(new Request(url, init)),
    }),
  );
  return client;
}

const allowed: AgentAccount = {
  sessions: { authorize: async () => {} } as unknown as AgentAccount["sessions"],
  settings: { get: async () => ({ remoteControl: true }) },
};
const stateCall = {
  name: "set_region",
  arguments: {
    sessionId: crypto.randomUUID(),
    region: { chromosome: "chr1", start: 0, end: 10 },
  },
};
const browserCall = {
  name: "export_image",
  arguments: {
    sessionId: crypto.randomUUID(),
    format: "svg",
  },
};

it("lists tools and reports an unavailable relay or account store per call", async () => {
  const withoutRelay = await connect({
    authenticate: async () => true,
    account: async () => allowed,
    relay: () => {
      throw new Error("REDIS_URL must be set for agent commands");
    },
    sessionService: () => Promise.reject(new Error("Not reached")),
  });
  expect((await withoutRelay.listTools()).tools.map(({ name }) => name)).toEqual(
    commands.map(({ name }) => name),
  );
  expect(await withoutRelay.callTool(browserCall)).toMatchObject({
    isError: true,
    content: [{ text: "UNAVAILABLE: Remote control is unavailable" }],
  });
  await withoutRelay.close();

  const withoutDatabase = await connect({
    authenticate: async () => true,
    account: () => Promise.reject(new Error("Database unavailable")),
    relay: () => {
      throw new Error("Not reached");
    },
    sessionService: () => Promise.reject(new Error("Database unavailable")),
  });
  expect(await withoutDatabase.callTool(stateCall)).toMatchObject({
    isError: true,
    content: [{ text: "UNAVAILABLE: Remote control is unavailable" }],
  });
  await withoutDatabase.close();
});
