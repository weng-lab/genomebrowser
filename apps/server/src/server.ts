import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { createHttpMiddleware } from "./http/middleware.ts";
import { registerRoutes } from "./http/routes.ts";
import { createMcpEndpoint } from "./mcp.ts";
import type { SessionRepository } from "./storage/sessionRepository.ts";
import { createTabConnections } from "./tabs.ts";

export type BrowserServerOptions = {
  sessions: SessionRepository;
  allowedOrigins?: readonly string[];
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
};

/** Compose HTTP routing, tab connections, MCP, and Node server lifetime. */
export function createBrowserServer(options: BrowserServerOptions) {
  const tabs = createTabConnections(options);
  const mcp = createMcpEndpoint(tabs);
  const app = new Hono();
  const middleware = createHttpMiddleware(options);
  registerRoutes(app, { tabs, mcp, middleware, sessions: options.sessions });
  const server = createServer(getRequestListener(app.fetch));
  const close = server.close.bind(server);
  server.close = (callback) => {
    tabs.close();
    void mcp.close();
    return close(callback);
  };
  return server;
}
