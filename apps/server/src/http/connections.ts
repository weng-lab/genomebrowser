import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { commandReplySchema } from "../protocol.ts";
import type { BrowserRelay } from "../relay.ts";
import type { SessionRepository } from "../storage/sessionRepository.ts";

export async function openConnection(c: Context, relay: BrowserRelay, sessions: SessionRepository) {
  let snapshot;
  try {
    snapshot = await sessions.load();
  } catch {
    return c.json({ error: "Session storage is unavailable" }, 503);
  }
  c.header("X-Accel-Buffering", "no");
  const response = streamSSE(c, (stream) => relay.connectBrowser(stream, snapshot));
  response.headers.set("Cache-Control", "no-cache, no-transform");
  return response;
}

export async function acknowledgeCommand(c: Context, relay: BrowserRelay) {
  const parsed = commandReplySchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid command result" }, 400);
  if (!relay.acknowledgeCommand(c.req.param().clientId, parsed.data))
    return c.json({ error: "Command is not pending for this browser" }, 409);
  return c.json({ ok: true });
}
