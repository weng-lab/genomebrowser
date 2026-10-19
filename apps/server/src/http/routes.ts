import type { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { commandReplySchema, sessionIdSchema } from "../../../web/commands/contracts.ts";
import type { TabConnections } from "../tabs.ts";
import { handleHttpError, type HttpMiddleware } from "./middleware.ts";

export function registerRoutes(
  app: Hono,
  dependencies: {
    tabs: TabConnections;
    mcp: { fetch: (request: Request) => Promise<Response> };
    middleware: HttpMiddleware;
  },
) {
  const { tabs, mcp, middleware: access } = dependencies;

  app.use("*", access.checkLocalRequest);
  app.onError(handleHttpError);
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.get("/health", (c) => c.json({ ok: true }));
  app.all("/mcp", (c) => mcp.fetch(c.req.raw));

  app.use("/rpc/:sessionId", async (c, next) => {
    if (!sessionIdSchema.safeParse(c.req.param("sessionId")).success) {
      return c.json({ error: "Invalid session ID" }, 400);
    }
    return next();
  });

  // A tab opens this stream to accept commands for its session. The first tab keeps it.
  app.get("/rpc/:sessionId", (c) => {
    const id = c.req.param("sessionId");
    if (tabs.isConnected(id)) {
      return c.json({ error: "The session is already connected in another tab" }, 409);
    }
    c.header("X-Accel-Buffering", "no");
    const response = streamSSE(c, (stream) => tabs.connect(id, stream));
    response.headers.set("Cache-Control", "no-cache, no-transform");
    return response;
  });

  app.post("/rpc/:sessionId", access.limitReplyBody, async (c) => {
    const parsed = commandReplySchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: "Invalid command reply" }, 400);
    if (!tabs.acknowledge(c.req.param("sessionId"), parsed.data)) {
      return c.json({ error: "Command is not pending for this session" }, 409);
    }
    return c.json({ ok: true });
  });
}
