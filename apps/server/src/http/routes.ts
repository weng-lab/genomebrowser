import type { Context, Hono, MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { commandReplySchema, sessionIdSchema, sessionSnapshotSchema } from "../protocol.ts";
import type { SessionRepository } from "../storage/sessionRepository.ts";
import type { TabConnections } from "../tabs.ts";
import { handleHttpError, type HttpMiddleware } from "./middleware.ts";

export function registerRoutes(
  app: Hono,
  dependencies: {
    tabs: TabConnections;
    sessions: SessionRepository;
    mcp: { fetch: (request: Request) => Promise<Response> };
    middleware: HttpMiddleware;
  },
) {
  const { tabs, sessions, mcp, middleware: access } = dependencies;

  const requireSessionId: MiddlewareHandler = async (c, next) => {
    if (!sessionIdSchema.safeParse(c.req.param("sessionId")).success) {
      return c.json({ error: "Invalid session ID" }, 400);
    }
    return next();
  };
  const sessionId = (c: Context) => c.req.param("sessionId")!;

  app.use("*", access.checkLocalRequest);
  app.onError(handleHttpError);
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.get("/health", (c) => c.json({ ok: true }));
  app.all("/mcp", (c) => mcp.fetch(c.req.raw));

  app.get("/api/sessions/:sessionId", requireSessionId, async (c) => {
    const snapshot = await sessions.load(sessionId(c));
    return snapshot ? c.json(snapshot) : c.json({ error: "Session not found" }, 404);
  });

  app.put("/api/sessions/:sessionId", requireSessionId, access.limitSnapshotBody, async (c) => {
    const parsed = sessionSnapshotSchema.safeParse(await c.req.json());
    if (!parsed.success) return c.json({ error: "Invalid session snapshot" }, 400);
    await sessions.save(sessionId(c), parsed.data);
    return c.json({ ok: true });
  });

  // A tab opens this stream to accept remote commands. The first tab keeps the session.
  app.get("/api/sessions/:sessionId/rpc", requireSessionId, (c) => {
    const id = sessionId(c);
    if (tabs.isConnected(id)) {
      return c.json({ error: "The session is already connected in another tab" }, 409);
    }
    c.header("X-Accel-Buffering", "no");
    const response = streamSSE(c, (stream) => tabs.connect(id, stream));
    response.headers.set("Cache-Control", "no-cache, no-transform");
    return response;
  });

  app.post(
    "/api/sessions/:sessionId/rpc",
    requireSessionId,
    access.limitSnapshotBody,
    async (c) => {
      const parsed = commandReplySchema.safeParse(await c.req.json());
      if (!parsed.success) return c.json({ error: "Invalid command result" }, 400);
      if (!tabs.acknowledge(sessionId(c), parsed.data)) {
        return c.json({ error: "Command is not pending for this session" }, 409);
      }
      return c.json({ ok: true });
    },
  );
}
