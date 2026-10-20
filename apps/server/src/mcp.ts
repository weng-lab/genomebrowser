import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { commands, sessionIdSchema } from "@weng-lab/contracts";
import { z } from "zod";
import type { TabConnections } from "./tabs.ts";

/** Register each command as an MCP tool that runs in the tab connected for its session. */
export function createMcpEndpoint(tabs: TabConnections) {
  function createServer() {
    const server = new McpServer({ name: "genome-browser", version: "0.0.0" });
    for (const command of commands) {
      server.registerTool(
        command.name,
        {
          description: command.description,
          inputSchema: z.strictObject({
            ...command.params.shape,
            sessionId: sessionIdSchema.describe(
              "The session open in the browser tab, as shown in the tab's Agent panel.",
            ),
          }),
          outputSchema: command.result,
        },
        async ({ sessionId, ...params }, ctx) => {
          const result = await tabs.dispatch(
            sessionId,
            { name: command.name, params },
            ctx.mcpReq.signal,
          );
          const value = result.ok ? command.result.safeParse(result.value) : undefined;
          if (!result.ok || !value?.success) {
            const text = result.ok
              ? "INVALID_REPLY: The browser tab returned an invalid result"
              : `${result.code}: ${result.error}`;
            return { content: [{ type: "text", text }], isError: true };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(value.data) }],
            structuredContent: value.data,
          };
        },
      );
    }
    return server;
  }

  const handler = createMcpHandler(createServer, { responseMode: "json" });
  const requests = new Set<Promise<Response>>();
  return {
    fetch(request: Request) {
      const response = handler.fetch(request);
      requests.add(response);
      void response.finally(() => requests.delete(response)).catch(() => {});
      return response;
    },
    /** Let calls in progress reply, such as those `tabs.close` just failed, then close. */
    async close() {
      await Promise.allSettled(requests);
      await handler.close();
    },
  };
}
