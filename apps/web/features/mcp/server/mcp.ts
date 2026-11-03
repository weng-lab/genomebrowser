import "server-only";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { commands, type Command } from "../../agent/commands";
import { authorizeRemoteControl, type AgentAccount } from "../../agent/server/access";
import type { CommandRelay } from "../../agent/server/relay";
import { sessionIdSchema } from "../../sessions/schema";

type Dependencies = {
  /** The account an MCP request acts for, from its verified credentials, or null without any. */
  authenticate(request: Request): Promise<AgentAccount | null>;
  relay: CommandRelay;
};

const failed = (text: string) => ({ isError: true, content: [{ type: "text" as const, text }] });

/** Publish every agent command as a tool that runs in the tab attached to the caller's session. */
function createServer(account: AgentAccount, relay: CommandRelay, request?: Request) {
  const server = new McpServer({ name: "genomebrowser", version: "1.0.0" });
  for (const command of commands as readonly Command[]) {
    server.registerTool(
      command.name,
      {
        description: command.description,
        inputSchema: command.params.extend({
          sessionId: sessionIdSchema.describe(
            "Your saved session open in a browser tab with remote control on: the ID in its /browser/<id> address.",
          ),
        }),
        outputSchema: command.result,
      },
      async ({ sessionId, ...params }, context) => {
        try {
          const denied = await authorizeRemoteControl(account, sessionId as string);
          if (denied) return failed(`${denied.code}: ${denied.error}`);
        } catch (error) {
          console.error("Could not authorize an MCP command", error);
          return failed("UNAVAILABLE: Remote control is unavailable");
        }
        const signals = [context.mcpReq.signal, request?.signal].filter((signal) => !!signal);
        const result = await relay.dispatch(
          sessionId as string,
          { name: command.name, params },
          AbortSignal.any(signals),
        );
        if (!result.ok) return failed(`${result.code}: ${result.error}`);
        const value = command.result.safeParse(result.value);
        if (!value.success)
          return failed("INVALID_REPLY: The browser tab returned an invalid result");
        return {
          content: [{ type: "text" as const, text: JSON.stringify(value.data) }],
          structuredContent: value.data,
        };
      },
    );
  }
  return server;
}

/**
 * The app's MCP endpoint. Every request needs verified credentials, and every
 * tool call is authorized for the caller's own session and Remote Control
 * preference before it reaches the browser tab. Stateless: any instance serves
 * any request.
 */
export function createMcpEndpoint({ authenticate, relay }: Dependencies) {
  const handler = createMcpHandler(
    ({ authInfo, requestInfo }) =>
      createServer((authInfo!.extra as { account: AgentAccount }).account, relay, requestInfo),
    { responseMode: "json", maxRequestBodySize: 65_536 },
  );
  return {
    async fetch(request: Request) {
      // Browsers send cookies with cross-site requests; only this app's pages may use them.
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "Origin is not allowed" }, { status: 403 });
      const account = await authenticate(request);
      if (!account)
        return Response.json(
          { error: "Sign in to connect to Genomebrowser" },
          { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } },
        );
      return handler.fetch(request, {
        authInfo: { token: "", clientId: "", scopes: [], extra: { account } },
      });
    },
    close: () => handler.close(),
  };
}
