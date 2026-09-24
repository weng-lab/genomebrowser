import "server-only";
import { z } from "zod";
import { requireOwner } from "@/features/auth/owner";
import { parseSessionSnapshot } from "@/features/session-snapshot/parseSnapshot";
import { SESSION_NAME_MAX_LENGTH } from "./rules";
import { sessionIdSchema, sessionNameSchema } from "./server/schemas";
import { getSessionRepository, SessionWriteError } from "./server/repository";
import type { SaveSessionResult, SessionUpdate } from "./types";

const updateSchema = z.strictObject({
  id: sessionIdSchema,
  revision: z.number().int().positive(),
  name: sessionNameSchema,
  snapshot: z.unknown(),
});

export function parseSessionUpdate(input: unknown): SessionUpdate {
  const parsed = updateSchema.parse(input);
  return { ...parsed, snapshot: parseSessionSnapshot(parsed.snapshot) };
}

/**
 * Autosave write for `PUT /api/sessions/[sessionId]`. Not a server action: autosave needs
 * `fetch` with keepalive so pending edits can flush while the page is hidden or closing.
 */
export async function saveSession(input: unknown): Promise<SaveSessionResult> {
  const owner = await requireOwner("Sign in to save your session.");
  if (!owner.ok) return owner;
  let update: SessionUpdate;
  try {
    update = parseSessionUpdate(input);
  } catch {
    return {
      ok: false,
      error: `The session is invalid. Use a name of 1–${SESSION_NAME_MAX_LENGTH} characters and valid browser and track settings.`,
    };
  }
  try {
    const repository = await getSessionRepository();
    if (!repository) return { ok: false, error: "Session storage is not configured." };
    return { ok: true, ...(await repository.update(owner.ownerId, update)) };
  } catch (error) {
    return error instanceof SessionWriteError
      ? { ok: false, retryable: false, error: error.message }
      : { ok: false, retryable: true, error: "Your session could not be saved. Please try again." };
  }
}
