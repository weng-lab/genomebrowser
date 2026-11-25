import "server-only";
import { randomUUID } from "node:crypto";
import {
  maxSessionBytes,
  type SavedSession,
  type Session,
  type SessionInput,
  type SessionUpdate,
} from "../schema";
import type { SessionSnapshot } from "../snapshot.ts";
import {
  applySessionPatch,
  sessionPatchRequestSchema,
  type SessionEvent,
  type SessionPatchRequest,
} from "../syncSchema";
import type { SessionBus } from "./bus";
import { SessionError, type Sessions } from "./sessions";

export type SessionMutationResult =
  | { ok: true; name: string; snapshot: SessionSnapshot }
  | { ok: false; code: string; error: string };

export type SessionServiceOptions = {
  sessions: Sessions;
  bus: SessionBus;
  /** How often an open SSE stream sends a keep-alive comment. Defaults to 15s. */
  heartbeatIntervalMs?: number;
  /** How long one SSE stream stays open before ending cleanly so clients reconnect. Defaults to 240s. */
  streamLifetimeMs?: number;
};

/**
 * Authoritative owner for live sessions on the server. Both HTTP session routes
 * and server-side MCP tools read and mutate through this service: PostgreSQL
 * persists durable truth, while `SessionBus` fans out lightweight revision hints
 * and deletion notices to subscribed web clients.
 */
export type SessionService = {
  list(): Promise<Session[]>;
  create(input: SessionInput): Promise<Session>;
  /** Read the authorized session directly from PostgreSQL. */
  load(id: string): Promise<SavedSession>;
  /** Full conditional replacement (`PUT`), persisting to DB and publishing a revision hint. */
  update(id: string, input: SessionUpdate, options?: { sourceClientId?: string }): Promise<Session>;
  /** Partial merge (`PATCH`) from a browser tab, retrying cleanly on concurrent edits. */
  patch(id: string, request: SessionPatchRequest): Promise<SavedSession>;
  /**
   * Apply a domain mutation atomically against the latest persisted state,
   * persist to PostgreSQL, and publish a revision hint to subscribed clients.
   */
  mutate<T = SavedSession>(
    id: string,
    apply: (
      current: SavedSession,
    ) =>
      | { ok: true; name: string; snapshot: SessionSnapshot; value?: T }
      | { ok: false; code: string; error: string },
    options?: { sourceClientId?: string; saveId?: string },
  ): Promise<
    { ok: true; session: SavedSession; value: T } | { ok: false; code: string; error: string }
  >;
  /** Delete from PostgreSQL and notify all open clients immediately. */
  remove(id: string): Promise<void>;
  authorize(id: string): Promise<void>;
  /**
   * Open an SSE stream of live `updated` hints and `deleted` notices for `id`.
   * Sends an immediate catch-up `updated` hint when `sinceRevision` is behind.
   */
  subscribe(
    id: string,
    signal: AbortSignal,
    options?: { sinceRevision?: number },
  ): Promise<ReadableStream<Uint8Array>>;
};

const maxMergeAttempts = 4;

export function createSessionService({
  sessions,
  bus,
  heartbeatIntervalMs = 15_000,
  streamLifetimeMs = 240_000,
}: SessionServiceOptions): SessionService {
  async function publishUpdated(id: string, revision: number, sourceClientId?: string) {
    await bus.publish(id, {
      type: "updated",
      revision,
      ...(sourceClientId ? { sourceClientId } : {}),
    });
  }

  async function mutate<T = SavedSession>(
    id: string,
    apply: (
      current: SavedSession,
    ) =>
      | { ok: true; name: string; snapshot: SessionSnapshot; value?: T }
      | { ok: false; code: string; error: string },
    options: { sourceClientId?: string; saveId?: string } = {},
  ): Promise<
    { ok: true; session: SavedSession; value: T } | { ok: false; code: string; error: string }
  > {
    const saveId = options.saveId ?? randomUUID();

    for (let attempt = 0; attempt < maxMergeAttempts; attempt++) {
      const current = await sessions.loadWithSaveId(id);
      if (options.saveId && current.saveId === options.saveId) {
        const { saveId: _ignored, ...saved } = current;
        return { ok: true, session: saved, value: saved as unknown as T };
      }

      const { saveId: _saveId, ...savedCurrent } = current;
      const result = apply(savedCurrent);
      if (!result.ok) return result;

      const bytes = new TextEncoder().encode(
        JSON.stringify({ name: result.name, snapshot: result.snapshot }),
      ).byteLength;
      if (bytes > maxSessionBytes) {
        throw new SessionError("INVALID_INPUT", "Sessions are limited to 1 MB");
      }

      try {
        const meta = await sessions.update(id, {
          name: result.name,
          snapshot: result.snapshot,
          revision: savedCurrent.revision,
          saveId,
        });
        const saved: SavedSession = { ...meta, snapshot: result.snapshot };
        await publishUpdated(saved.id, saved.revision, options.sourceClientId);
        return {
          ok: true,
          session: saved,
          value: (result.value !== undefined ? result.value : saved) as T,
        };
      } catch (error) {
        if (
          error instanceof SessionError &&
          error.code === "CONFLICT" &&
          attempt < maxMergeAttempts - 1
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new SessionError("CONFLICT", "Could not merge concurrent session updates");
  }

  return {
    list: () => sessions.list(),
    create: (input) => sessions.create(input),
    load: (id) => sessions.load(id),

    async update(id, input, options) {
      const updated = await sessions.update(id, input);
      await publishUpdated(updated.id, updated.revision, options?.sourceClientId);
      return updated;
    },

    async patch(id, rawRequest) {
      const parsed = sessionPatchRequestSchema.safeParse(rawRequest);
      if (!parsed.success) {
        throw new SessionError("INVALID_INPUT", "Invalid session patch request");
      }
      const { clientId, saveId, patch } = parsed.data;
      const outcome = await mutate(
        id,
        (current) => {
          try {
            const next = applySessionPatch(current, patch);
            return { ok: true, ...next };
          } catch (cause) {
            throw new SessionError(
              "INVALID_INPUT",
              cause instanceof Error ? cause.message : "Invalid session patch",
            );
          }
        },
        { sourceClientId: clientId, saveId },
      );
      if (!outcome.ok) throw new SessionError("INVALID_INPUT", outcome.error);
      return outcome.session;
    },

    mutate,

    async remove(id) {
      await sessions.remove(id);
      await bus.publish(id, { type: "deleted", sessionId: id });
    },

    authorize: (id) => sessions.authorize(id),

    async subscribe(id, signal, { sinceRevision } = {}) {
      await sessions.authorize(id);
      const streamAbort = new AbortController();
      const encoder = new TextEncoder();
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      let closed = false;
      let ready = false;
      let sentRevision = sinceRevision ?? 0;
      const buffered: SessionEvent[] = [];

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
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

      const emit = (event: SessionEvent) => {
        if (event.type === "updated") {
          if (event.revision <= sentRevision) return;
          sentRevision = event.revision;
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

      const onSignalAbort = () => close();
      if (signal.aborted) {
        close();
        return stream;
      }
      signal.addEventListener("abort", onSignalAbort, { once: true });

      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n");
      }, heartbeatIntervalMs);
      const lifetime = setTimeout(() => {
        close();
      }, streamLifetimeMs);

      try {
        // Subscribe BEFORE checking catch-up revision so no concurrent update falls between.
        await bus.subscribe(
          id,
          (event) => {
            if (closed) return;
            if (!ready) buffered.push(event);
            else emit(event);
          },
          streamAbort.signal,
          close,
        );

        write(": connected\n\n");

        try {
          const current = await sessions.load(id);
          if (!closed && current.revision > sentRevision) {
            emit({ type: "updated", revision: current.revision });
          }
        } catch (error) {
          if (error instanceof SessionError && error.code === "NOT_FOUND") {
            emit({ type: "deleted", sessionId: id });
          } else {
            throw error;
          }
        }

        ready = true;
        for (const event of buffered) {
          if (closed) break;
          emit(event);
        }
        buffered.length = 0;
      } catch (error) {
        signal.removeEventListener("abort", onSignalAbort);
        close();
        throw error;
      }

      streamAbort.signal.addEventListener(
        "abort",
        () => {
          signal.removeEventListener("abort", onSignalAbort);
        },
        { once: true },
      );

      return stream;
    },
  };
}
