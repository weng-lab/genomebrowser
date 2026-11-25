import "server-only";
import { z } from "zod";
import { maxSessionBytes, type SessionErrorCode } from "../schema";
import type { SessionEvent } from "../syncSchema";
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

/** Read a raw JSON body of at most 1 MB for `SessionService.patch` to validate once. */
export async function readSessionPatch(request: Request): Promise<unknown> {
  return readJson(request);
}

const sinceRevisionSchema = z.coerce.number().int().nonnegative();
const defaultHeartbeatIntervalMs = 15_000;
const defaultStreamLifetimeMs = 240_000;

/** Open the SSE stream of live session updates and deletion notices for one tab. */
export async function openSessionEventStream(
  request: Request,
  sessionId: string,
  getService: () => Promise<SessionService>,
  {
    heartbeatIntervalMs = defaultHeartbeatIntervalMs,
    streamLifetimeMs = defaultStreamLifetimeMs,
  }: { heartbeatIntervalMs?: number; streamLifetimeMs?: number } = {},
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
    const streamAbort = new AbortController();
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let lifetime: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const onRequestAbort = () => close();

    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(lifetime);
      request.signal.removeEventListener("abort", onRequestAbort);
      streamAbort.abort();
      try {
        controller?.close();
      } catch {
        // Stream was already closed or cancelled.
      }
    };

    const write = (text: string) => {
      if (closed) return;
      try {
        controller?.enqueue(encoder.encode(text));
      } catch {
        close();
      }
    };

    const writeEvent = (event: SessionEvent) => {
      if (event.type === "updated") {
        write(`event: updated\ndata: ${JSON.stringify(event)}\n\n`);
        return;
      }
      write(`event: deleted\ndata: ${JSON.stringify(event)}\n\n`);
      close();
    };

    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
      cancel() {
        controller = undefined;
        close();
      },
    });

    if (request.signal.aborted) {
      close();
    } else {
      request.signal.addEventListener("abort", onRequestAbort, { once: true });
      try {
        await service.subscribe(sessionId, writeEvent, streamAbort.signal, {
          sinceRevision,
          onDisconnect: close,
        });
      } catch (error) {
        close();
        throw error;
      }
      if (!closed) {
        write(": connected\n\n");
        heartbeat = setInterval(() => write(": heartbeat\n\n"), heartbeatIntervalMs);
        lifetime = setTimeout(close, streamLifetimeMs);
      }
    }

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
