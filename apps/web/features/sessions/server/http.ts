import "server-only";
import { z } from "zod";
import { maxSessionBytes, type SessionErrorCode } from "../schema";
import { sessionPatchRequestSchema } from "../syncSchema";
import { readJsonBody } from "../../../shared/server/readJsonBody";
import { parseSessionInput, parseSessionUpdate, SessionError } from "./sessions";
import type { SessionService } from "./service";

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

export async function readSessionUpdate(request: Request) {
  return parseSessionUpdate(await readJson(request));
}

/** Read and validate a partial live edit (`PATCH`) of at most 1 MB. */
export async function readSessionPatch(request: Request) {
  const result = sessionPatchRequestSchema.safeParse(await readJson(request));
  if (!result.success) throw new SessionError("INVALID_INPUT", z.prettifyError(result.error));
  return result.data;
}

const sinceRevisionSchema = z.coerce.number().int().nonnegative();

/** Open the SSE stream of live session updates and deletion notices for one tab. */
export async function openSessionEventStream(
  request: Request,
  sessionId: string,
  getService: () => Promise<SessionService>,
) {
  const rawSince = new URL(request.url).searchParams.get("sinceRevision");
  let sinceRevision: number | undefined;
  if (rawSince !== null) {
    const parsed = sinceRevisionSchema.safeParse(rawSince);
    if (!parsed.success) {
      return Response.json(
        { code: "INVALID_INPUT", message: "Invalid sinceRevision query parameter" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    sinceRevision = parsed.data;
  }

  try {
    const service = await getService();
    const stream = await service.subscribe(sessionId, request.signal, { sinceRevision });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof SessionError) {
      return Response.json(
        { code: error.code, message: error.message },
        { status: statuses[error.code], headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("Session event stream failed", error);
    return Response.json(
      { message: "Saved sessions are unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function readJson(request: Request) {
  return readJsonBody(request, {
    maxBytes: maxSessionBytes,
    tooLarge: () => new SessionError("INVALID_INPUT", "Sessions are limited to 1 MB"),
    invalid: () => new SessionError("INVALID_INPUT", "The request body must be JSON"),
  });
}
