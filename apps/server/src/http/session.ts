import type { Context } from "hono";
import { sessionSnapshotSchema } from "../protocol.ts";
import type { SessionRepository } from "../storage/sessionRepository.ts";

export async function saveSession(c: Context, sessions: SessionRepository) {
  const parsed = sessionSnapshotSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid session snapshot" }, 400);
  try {
    await sessions.save(parsed.data);
  } catch {
    return c.json({ error: "Session storage is unavailable" }, 503);
  }
  return c.json({ ok: true });
}
