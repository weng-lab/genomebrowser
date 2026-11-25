import "server-only";
import { maxSessionBytes } from "../schema";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { createResponder } from "../../../shared/server/respond";
import { parseSessionInput, parseSessionUpdate, SessionError } from "./sessions";

/** Run one operation for a session route. */
export const respond = createResponder(
  SessionError,
  {
    INVALID_INPUT: 400,
    UNAUTHENTICATED: 401,
    NOT_FOUND: 404,
    ASSEMBLY_CHANGED: 409,
    CONFLICT: 409,
  },
  { log: "Session request failed", message: "Saved sessions are unavailable" },
);

/** Read and validate a session name and snapshot of at most 1 MB. */
export async function readSessionInput(request: Request) {
  return parseSessionInput(await readJson(request));
}

export async function readSessionUpdate(request: Request) {
  return parseSessionUpdate(await readJson(request));
}

function readJson(request: Request) {
  return readJsonBody(request, {
    maxBytes: maxSessionBytes,
    tooLarge: () => new SessionError("INVALID_INPUT", "Sessions are limited to 1 MB"),
    invalid: () => new SessionError("INVALID_INPUT", "The request body must be JSON"),
  });
}
