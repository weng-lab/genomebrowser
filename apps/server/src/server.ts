import { createServer } from "node:http";
import type { Socket } from "node:net";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { createHttpMiddleware } from "./http/middleware.ts";
import { registerRoutes } from "./http/routes.ts";
import { createMcpEndpoint } from "./mcp.ts";
import { createTabConnections } from "./tabs.ts";

export type BrowserServerOptions = {
  allowedOrigins?: readonly string[];
  commandTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  /** How long `close` waits for open requests to finish before ending their connections. */
  shutdownTimeoutMs?: number;
};

export const defaultShutdownTimeoutMs = 5_000;

/** Compose HTTP routing, tab connections, MCP, and Node server lifetime. */
export function createBrowserServer(options: BrowserServerOptions = {}) {
  const tabs = createTabConnections(options);
  const mcp = createMcpEndpoint(tabs);
  const app = new Hono();
  const middleware = createHttpMiddleware(options);
  registerRoutes(app, { tabs, mcp, middleware });
  const listener = getRequestListener(app.fetch);

  // Connections with no response in progress. Node's `closeIdleConnections` misses
  // ones whose response ends after `close`, such as a tab's stream, and ones a
  // client opened without sending a request, so the server tracks its own.
  const idle = new Set<Socket>();
  let closing = false;
  const server = createServer((request, response) => {
    const socket = request.socket;
    idle.delete(socket);
    response.once("close", () => {
      if (socket.destroyed) return;
      if (closing) socket.end();
      else idle.add(socket);
    });
    listener(request, response).catch((error: unknown) => {
      console.error("Could not handle browser server request", error);
      response.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  });
  server.on("connection", (socket) => {
    if (closing) return socket.destroy();
    idle.add(socket);
    socket.once("close", () => idle.delete(socket));
  });

  const close = server.close.bind(server);
  let shutdown: Promise<void> | undefined;
  /**
   * Stop accepting connections, fail pending commands, let requests in progress
   * reply, and end each connection once it is idle. Connections still open after
   * `shutdownTimeoutMs` are ended regardless.
   */
  server.close = (callback) => {
    if (!shutdown) {
      closing = true;
      const httpClosed = new Promise<void>((resolve, reject) => {
        close((error) => (error ? reject(error) : resolve()));
      });
      for (const socket of idle) socket.end();
      const force = setTimeout(
        () => server.closeAllConnections(),
        options.shutdownTimeoutMs ?? defaultShutdownTimeoutMs,
      ).unref();
      server.once("close", () => clearTimeout(force));
      tabs.close();
      // Pending tools first receive the tab-disconnected error. The callback
      // waits for both their MCP cleanup and the HTTP connections to finish.
      shutdown = Promise.all([httpClosed, mcp.close()]).then(() => {});
    }
    void shutdown.then(
      () => callback?.(),
      (error: Error) => {
        if (callback) callback(error);
        else console.error("Could not close browser server", error);
      },
    );
    return server;
  };
  return server;
}
