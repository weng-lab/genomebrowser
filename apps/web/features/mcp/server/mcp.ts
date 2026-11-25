import "server-only";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { commands, type Command } from "../../agent/commands";
import type { CommandResult } from "../../agent/commands/protocol";
import { authorizeRemoteControl, type AgentAccount } from "../../agent/server/access";
import type { CommandRelay } from "../../agent/server/relay";
import { isServerStateCommand, runServerStateCommand } from "../../agent/server/stateCommands";
import { sessionIdSchema } from "../../sessions/schema";
import { SessionError } from "../../sessions/server/sessions";
import type { SessionService } from "../../sessions/server/service";

/** Resolved when needed, so missing configuration fails the affected call rather than every request. */
type Dependencies = {
  /** Whether the request carries verified credentials of a user. */
  authenticate(request: Request): Promise<boolean>;
  /** Operations for the user the current request acts for. */
  account(): Promise<AgentAccount>;
  relay(): CommandRelay;
  /**
   * Optional authoritative session service. When provided, pure state commands
   * (`set_region`, `list_tracks`, `sort_tracks`, `set_track_metadata`) run
   * directly on the server with 0..N open tabs and broadcast live via SSE.
   */
  sessionService?: () => Promise<SessionService>;
};

const failed = (text: string) => ({ isError: true, content: [{ type: "text" as const, text }] });

/** Publish every agent command as a tool. State tools run directly on `SessionService`; browser-only tools relay to a tab. */
function createServer(
  { account, relay, sessionService }: Omit<Dependencies, "authenticate">,
  request?: Request,
) {
  const server = new McpServer({ name: "genomebrowser", version: "1.0.0" });
  for (const command of commands as readonly Command[]) {
    server.registerTool(
      command.name,
      {
        description: command.description,
        inputSchema: command.params.extend({
          sessionId: sessionIdSchema.describe(
            "Your saved session ID (the ID in its /browser/<id> address). State tools work even when the session is not open in a tab.",
          ),
        }),
        outputSchema: command.result,
      },
      async ({ sessionId, ...params }, context) => {
        const useServerState = Boolean(sessionService && isServerStateCommand(command.name));
        let result: CommandResult;
        try {
          const denied = await authorizeRemoteControl(await account(), sessionId as string);
          if (denied) return failed(`${denied.code}: ${denied.error}`);

          if (useServerState && sessionService) {
            result = await runServerStateCommand(
              await sessionService(),
              sessionId as string,
              command.name,
              params,
            );
          } else {
            const commandRelay = relay();
            const signals = [context.mcpReq.signal, request?.signal].filter((signal) => !!signal);
            result = await commandRelay.dispatch(
              sessionId as string,
              { name: command.name, params },
              AbortSignal.any(signals),
              { timeoutMs: command.timeoutMs },
            );
          }
        } catch (error) {
          if (error instanceof SessionError) return failed(`${error.code}: ${error.message}`);
          console.error("Could not execute an MCP command", error);
          return failed("UNAVAILABLE: Remote control is unavailable");
        }
        if (!result.ok) return failed(`${result.code}: ${result.error}`);
        const value = command.result.safeParse(result.value);
        if (!value.success) return failed("INVALID_REPLY: The command returned an invalid result");
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
 * preference. State commands run directly on the authoritative session service
 * and broadcast to any open tabs; browser-only commands relay to an open tab.
 */
export function createMcpEndpoint({ authenticate, ...dependencies }: Dependencies) {
  const handler = createMcpHandler(({ requestInfo }) => createServer(dependencies, requestInfo), {
    responseMode: "json",
    maxRequestBodySize: 65_536,
  });
  return {
    async fetch(request: Request) {
      // Browsers send cookies with cross-site requests; only this app's pages may use them.
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "Origin is not allowed" }, { status: 403 });
      if (!(await authenticate(request)))
        return Response.json(
          { error: "Sign in to connect to Genomebrowser" },
          { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } },
        );
      return handler.fetch(request);
    },
    close: () => handler.close(),
  };
}
