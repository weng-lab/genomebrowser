import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { commands, type Command } from "../../agent/commands";
import type { CommandResult } from "../../agent/commands/protocol";
import { authorizeRemoteControl, type AgentAccount } from "../../agent/server/access";
import type { CommandRelay } from "../../agent/server/relay";
import { runServerStateCommand } from "../../agent/server/stateCommands";
import { sessionIdSchema } from "../../sessions/schema";
import { SessionError } from "../../sessions/server/sessions";
import type { SessionService } from "../../sessions/server/service";

/** Verified caller authenticated for one MCP HTTP request. */
export type McpCaller = {
  userId: string;
  /** When set, this credential may act only on this saved session. */
  sessionId?: string;
};

/** Resolved when needed, so missing configuration fails the affected call rather than every request. */
type Dependencies = {
  /** Verified caller of the request, or null when unauthenticated. */
  authenticate(request: Request): Promise<McpCaller | null>;
  /** Operations for the verified user `userId`. */
  account(userId: string): Promise<AgentAccount>;
  relay(): CommandRelay;
  /** Authoritative session service for state commands (`target: "state"`), acting for `userId`. */
  sessionService(userId: string): Promise<SessionService>;
};

const failed = (text: string) => ({ isError: true, content: [{ type: "text" as const, text }] });

/**
 * Publish every agent command as a tool for the caller's session. State tools
 * run directly on `SessionService`; browser-only tools relay to the attached tab.
 */
function createServer(
  { account, relay, sessionService }: Omit<Dependencies, "authenticate">,
  caller: McpCaller | undefined,
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
        if (!caller) return failed("UNAUTHENTICATED: Sign in to connect to Genomebrowser");
        const targetSession = sessionId as string;
        if (caller.sessionId && caller.sessionId !== targetSession)
          return failed("FORBIDDEN: This credential is scoped to another session");
        let result: CommandResult;
        try {
          const denied = await authorizeRemoteControl(await account(caller.userId), targetSession);
          if (denied) return failed(`${denied.code}: ${denied.error}`);

          // The caller cancelling or disconnecting stops either kind of command.
          const signal = AbortSignal.any(
            [context.mcpReq.signal, request?.signal].filter((signal) => !!signal),
          );
          if (command.target === "state") {
            result = await runServerStateCommand(
              await sessionService(caller.userId),
              targetSession,
              command,
              params,
              signal,
            );
          } else {
            result = await relay().dispatch(targetSession, { name: command.name, params }, signal, {
              timeoutMs: command.timeoutMs,
            });
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
  const currentCaller = new AsyncLocalStorage<McpCaller>();
  const handler = createMcpHandler(
    ({ requestInfo }) => createServer(dependencies, currentCaller.getStore(), requestInfo),
    {
      responseMode: "json",
      maxRequestBodySize: 65_536,
    },
  );
  return {
    async fetch(request: Request) {
      // Browsers send cookies with cross-site requests; only this app's pages may use them.
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        return Response.json({ error: "Origin is not allowed" }, { status: 403 });
      let caller: McpCaller | null;
      try {
        caller = await authenticate(request);
      } catch (error) {
        console.error("Could not authenticate an MCP request", error);
        return Response.json(
          { error: "Remote control is unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (!caller)
        return Response.json(
          { error: "Sign in to connect to Genomebrowser" },
          { status: 401, headers: { "Cache-Control": "no-store", "WWW-Authenticate": "Bearer" } },
        );
      return currentCaller.run(caller, () => handler.fetch(request));
    },
    close: () => handler.close(),
  };
}
