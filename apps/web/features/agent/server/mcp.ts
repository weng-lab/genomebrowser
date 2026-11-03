import { createMcpHandler, McpServer, type McpHttpHandler } from "@modelcontextprotocol/server";
import { commands, type Command } from "../commands";
import { sessionIdSchema } from "../../sessions/schema";
import { SessionError, type Sessions } from "../../sessions/server/sessions";
import { AccountSettingsError } from "../../account/server/settings";
import type { AccountSettings } from "../../account/settings";
import type { CommandRelay } from "../commands/server/relay";

export type McpCaller = { userId: string; sessionId?: string };
type Dependencies = {
  authenticate(request: Request): Promise<McpCaller | null>;
  account(
    userId: string,
  ): Promise<{ sessions: Sessions; settings: { get(): Promise<AccountSettings> } }>;
  relay: CommandRelay;
};

const failed = (text: string) => ({ isError: true, content: [{ type: "text" as const, text }] });

/** The app's MCP boundary. Every definition becomes a tool; Eve has no private command path. */
export function createGenomebrowserMcp({ authenticate, account, relay }: Dependencies) {
  const handler: McpHttpHandler = createMcpHandler(
    ({ authInfo, requestInfo }) => {
      const caller = authInfo!.extra as McpCaller;
      const server = new McpServer({ name: "genomebrowser", version: "1.0.0" });
      for (const command of commands as readonly Command[]) {
        server.registerTool(
          command.name,
          {
            description: command.description,
            inputSchema: command.params.extend({
              sessionId: sessionIdSchema.describe(
                "Your saved browser session, open in a connected tab.",
              ),
            }),
            outputSchema: command.result,
          },
          async ({ sessionId: target, ...params }, context) => {
            const sessionId = sessionIdSchema.parse(target);
            try {
              if (caller.sessionId && caller.sessionId !== sessionId)
                return failed("SESSION_SCOPE: This credential belongs to another session");
              const services = await account(caller.userId);
              if (!(await services.settings.get()).remoteControlEnabled)
                return failed(
                  "REMOTE_CONTROL_DISABLED: Remote control is disabled for this account",
                );
              await services.sessions.authorize(sessionId);
              const result = await relay.dispatch(
                sessionId,
                { name: command.name, params },
                AbortSignal.any([context.mcpReq.signal, requestInfo!.signal]),
              );
              if (!result.ok) return failed(`${result.code}: ${result.error}`);
              const parsed = command.result.safeParse(result.value);
              if (!parsed.success)
                return failed("INVALID_REPLY: The browser returned an invalid result");
              const value = parsed.data;
              return {
                content: [{ type: "text" as const, text: JSON.stringify(value) }],
                structuredContent: value,
              };
            } catch (error) {
              if (error instanceof SessionError) return failed(`${error.code}: ${error.message}`);
              if (error instanceof AccountSettingsError) return failed(error.message);
              console.error("MCP command failed", error);
              return failed("COMMAND_UNAVAILABLE: The command could not be completed");
            }
          },
        );
      }
      return server;
    },
    { responseMode: "json", maxRequestBodySize: 65_536 },
  );
  return {
    async fetch(request: Request) {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return new Response("Origin refused", { status: 403 });
      const caller = await authenticate(request);
      if (!caller)
        return Response.json(
          { error: "Sign in to connect to Genomebrowser" },
          {
            status: 401,
            headers: {
              "Cache-Control": "no-store",
              "WWW-Authenticate": `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/api/mcp", request.url)}"`,
            },
          },
        );
      return handler.fetch(request, {
        authInfo: { token: "", clientId: caller.userId, scopes: [], extra: caller },
      });
    },
    close: () => handler.close(),
  };
}
