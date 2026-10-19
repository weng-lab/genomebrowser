import type { Context, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";

export function createHttpMiddleware(options: { allowedOrigins?: readonly string[] }) {
  const origins = options.allowedOrigins ?? ["http://localhost:3000", "http://127.0.0.1:3000"];
  for (const origin of origins) {
    if (new URL(origin).origin !== origin) {
      throw new Error(`Invalid allowed origin: ${origin}`);
    }
  }

  const checkLocalRequest: MiddlewareHandler = async (c, next) => {
    c.header("Cache-Control", "no-store");
    const host = c.req.header("host");
    if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) {
      return c.json({ error: "Host is not allowed" }, 403);
    }
    const origin = c.req.header("origin");
    if (origin && !origins.includes(origin)) {
      return c.json({ error: "Origin is not allowed" }, 403);
    }
    await next();
  };

  const limitReplyBody = bodyLimit({
    maxSize: 1_048_576,
    onError: (c) => c.json({ error: "Request body is too large" }, 413),
  });

  return {
    checkLocalRequest,
    limitReplyBody,
  };
}

export function handleHttpError(error: Error, c: Context) {
  if (error instanceof SyntaxError) {
    return c.json({ error: "Invalid JSON request" }, 400);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
}

export type HttpMiddleware = ReturnType<typeof createHttpMiddleware>;
