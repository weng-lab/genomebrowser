import type { Hono, MiddlewareHandler } from "hono";
import { setRegion } from "../commands/setRegion.ts";
import type { BrowserRelay } from "../relay.ts";
import type { SessionRepository } from "../storage/sessionRepository.ts";
import { openConnection, acknowledgeCommand } from "./connections.ts";
import { handleHttpError, type HttpMiddleware } from "./middleware.ts";
import { saveSession } from "./session.ts";

export function registerBrowserRoutes(
  app: Hono,
  dependencies: {
    relay: BrowserRelay;
    sessions: SessionRepository;
    middleware: HttpMiddleware;
  },
) {
  const { relay, sessions, middleware: access } = dependencies;

  const requireBrowser: MiddlewareHandler = async (c, next) => {
    if (!relay.hasBrowser(c.req.param("clientId") ?? "")) {
      return c.json({ error: "Browser is not connected" }, 404);
    }
    return next();
  };

  app.use("*", access.checkLocalRequest);
  app.onError(handleHttpError);
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/api/browser/events", (c) => openConnection(c, relay, sessions));
  app.get("/api/browser/clients", (c) => c.json({ clients: relay.listBrowsers() }));

  app.post("/api/browser/clients/:clientId/region", requireBrowser, access.limitCommandBody, (c) =>
    setRegion(c, relay),
  );
  app.post("/api/browser/clients/:clientId/results", requireBrowser, access.limitCommandBody, (c) =>
    acknowledgeCommand(c, relay),
  );
  app.post("/api/browser/clients/:clientId/session", requireBrowser, access.limitSessionBody, (c) =>
    saveSession(c, sessions),
  );
}
