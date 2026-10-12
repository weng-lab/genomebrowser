import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { createHttpMiddleware } from "./http/middleware.ts";
import { registerBrowserRoutes } from "./http/routes.ts";
import { createBrowserRelay } from "./relay.ts";
import type { SessionRepository } from "./storage/sessionRepository.ts";

export type BrowserServerOptions = {
  sessions: SessionRepository;
  allowedOrigins?: readonly string[];
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
};

/** Compose HTTP routing, the live command relay, and Node server lifetime. */
export function createBrowserServer(options: BrowserServerOptions) {
  const relay = createBrowserRelay(options);
  const app = new Hono();
  const middleware = createHttpMiddleware(options);
  registerBrowserRoutes(app, { relay, middleware, sessions: options.sessions });
  const server = createServer(getRequestListener(app.fetch));
  const close = server.close.bind(server);
  server.close = (callback) => {
    relay.close();
    return close(callback);
  };
  return server;
}
