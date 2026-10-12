import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { commands } from "./commands/index.ts";
import { sessionIdSchema } from "./protocol.ts";
import type { TabConnections } from "./tabs.ts";

/** Register each command as an MCP tool that runs in the session's open tab. */
export function createMcpEndpoint(tabs: TabConnections) {
  function createServer() {
    const server = new McpServer({ name: "genome-browser", version: "0.0.0" });
    for (const command of commands) {
      server.registerTool(
        command.name,
        {
          description: command.description,
          inputSchema: z.strictObject({ ...command.params.shape, sessionId: sessionIdSchema }),
        },
        async ({ sessionId, ...params }, ctx) => {
          const result = await tabs.dispatch(
            sessionId,
            { name: command.name, params },
            ctx.mcpReq.signal,
          );
          if (!result.ok) {
            return {
              content: [{ type: "text", text: `${result.code}: ${result.error}` }],
              isError: true,
            };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(result.state) }],
            structuredContent: { state: result.state },
          };
        },
      );
    }
    return server;
  }

  return createMcpHandler(createServer, { responseMode: "json" });
}
