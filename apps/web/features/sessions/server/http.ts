import "server-only";
import { maxSessionBytes, type SessionErrorCode } from "../schema";
import { parseSessionInput, parseSessionUpdate, SessionError } from "./sessions";

const statuses: Record<SessionErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  ASSEMBLY_CHANGED: 409,
  CONFLICT: 409,
};

/**
 * Run one operation for a session route. Results are JSON, or 204 without one.
 * Session errors keep their code; any other failure is logged and reported
 * without detail.
 */
export async function respond(operation: () => Promise<unknown>) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const result = await operation();
    return result === undefined
      ? new Response(null, { status: 204, headers })
      : Response.json(result, { headers });
  } catch (error) {
    if (error instanceof SessionError) {
      return Response.json(
        { code: error.code, message: error.message },
        { status: statuses[error.code], headers },
      );
    }
    console.error("Session request failed", error);
    return Response.json({ message: "Saved sessions are unavailable" }, { status: 500, headers });
  }
}

/** Read and validate a session name and snapshot of at most 1 MB. */
export async function readSessionInput(request: Request) {
  return parseSessionInput(await readJson(request));
}

/** Read and validate a session update of at most 1 MB. */
export async function readSessionUpdate(request: Request) {
  return parseSessionUpdate(await readJson(request));
}

async function readJson(request: Request): Promise<unknown> {
  const tooLarge = () => new SessionError("INVALID_INPUT", "Sessions are limited to 1 MB");
  if (Number(request.headers.get("content-length")) > maxSessionBytes) throw tooLarge();
  // A chunked body has no declared length, so count bytes as they arrive.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxSessionBytes) {
      await reader.cancel();
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch {
    throw new SessionError("INVALID_INPUT", "The request body must be JSON");
  }
}
