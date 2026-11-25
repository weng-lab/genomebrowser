import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  maxSessionBytes,
  type SavedSession,
  type Session,
  type SessionInput,
  type SessionUpdate,
} from "../schema";
import type { SessionSnapshot } from "../snapshot.ts";
import { applySessionPatch, sessionPatchRequestSchema, type SessionEvent } from "../syncSchema";
import type { SessionBus } from "./bus";
import { SessionError, type Sessions } from "./sessions";

export type SessionMutationOutcome<T> =
  | { ok: true; session: SavedSession; value: T }
  | { ok: false; code: string; error: string };

export type SessionServiceOptions = {
  sessions: Sessions;
  bus: SessionBus;
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
  patch(id: string, request: unknown): Promise<SavedSession>;
  /**
   * Apply a domain mutation atomically against the latest persisted state,
   * persist to PostgreSQL, and publish a revision hint to subscribed clients.
   */
  mutate<T>(
    id: string,
    apply: (
      current: SavedSession,
    ) =>
      | { ok: true; name: string; snapshot: SessionSnapshot; value: T }
      | { ok: false; code: string; error: string },
    options?: { sourceClientId?: string },
  ): Promise<SessionMutationOutcome<T>>;
  /** Delete from PostgreSQL and notify all open clients immediately. */
  remove(id: string): Promise<void>;
  authorize(id: string): Promise<void>;
  /**
   * Subscribe to live `updated` hints and `deleted` notices for `id`, checking
   * PostgreSQL for catch-up updates after subscribing so no concurrent event is
   * missed. Delivers events to `onEvent` until `signal` aborts or deletion fires.
   */
  subscribe(
    id: string,
    onEvent: (event: SessionEvent) => void,
    signal: AbortSignal,
    options?: { sinceRevision?: number; onDisconnect?: () => void },
  ): Promise<void>;
};

const maxMergeAttempts = 4;

export function createSessionService({ sessions, bus }: SessionServiceOptions): SessionService {
  async function publishUpdated(id: string, revision: number, sourceClientId?: string) {
    await bus.publish(id, {
      type: "updated",
      revision,
      ...(sourceClientId ? { sourceClientId } : {}),
    });
  }

  function assertWithinSizeLimit(name: string, snapshot: SessionSnapshot) {
    const bytes = new TextEncoder().encode(JSON.stringify({ name, snapshot })).byteLength;
    if (bytes > maxSessionBytes) {
      throw new SessionError("INVALID_INPUT", "Sessions are limited to 1 MB");
    }
  }

  async function retryOnConflict<R>(operation: () => Promise<R>): Promise<R> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await operation();
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
      await sessions.authorize(id);
      const parsed = sessionPatchRequestSchema.safeParse(rawRequest);
      if (!parsed.success) {
        throw new SessionError("INVALID_INPUT", z.prettifyError(parsed.error));
      }
      const { clientId, saveId, patch } = parsed.data;
      return retryOnConflict(async () => {
        const current = await sessions.load(id);
        let next: { name: string; snapshot: SessionSnapshot };
        try {
          next = applySessionPatch(current, patch);
        } catch (cause) {
          throw new SessionError(
            "INVALID_INPUT",
            cause instanceof Error ? cause.message : "Invalid session patch",
          );
        }
        assertWithinSizeLimit(next.name, next.snapshot);
        const { session, applied } = await sessions.commit(id, {
          name: next.name,
          snapshot: next.snapshot,
          revision: current.revision,
          saveId,
        });
        if (applied) await publishUpdated(session.id, session.revision, clientId);
        return session;
      });
    },

    mutate<T>(
      id: string,
      apply: (
        current: SavedSession,
      ) =>
        | { ok: true; name: string; snapshot: SessionSnapshot; value: T }
        | { ok: false; code: string; error: string },
      options: { sourceClientId?: string } = {},
    ): Promise<SessionMutationOutcome<T>> {
      const saveId = randomUUID();
      return retryOnConflict(async () => {
        const current = await sessions.load(id);
        const result = apply(current);
        if (!result.ok) return result;
        assertWithinSizeLimit(result.name, result.snapshot);
        const { session, applied } = await sessions.commit(id, {
          name: result.name,
          snapshot: result.snapshot,
          revision: current.revision,
          saveId,
        });
        if (applied) await publishUpdated(session.id, session.revision, options.sourceClientId);
        return { ok: true, session, value: result.value };
      });
    },

    async remove(id) {
      await sessions.remove(id);
      await bus.publish(id, { type: "deleted", sessionId: id });
    },

    authorize: (id) => sessions.authorize(id),

    async subscribe(id, onEvent, signal, { sinceRevision, onDisconnect } = {}) {
      await sessions.authorize(id);
      if (signal.aborted) return;

      let sentRevision = sinceRevision ?? 0;
      let ready = false;
      let stopped = false;
      const buffered: SessionEvent[] = [];

      const stop = () => {
        stopped = true;
      };
      signal.addEventListener("abort", stop, { once: true });

      const deliver = (event: SessionEvent) => {
        if (stopped || signal.aborted) return;
        if (event.type === "updated") {
          if (event.revision <= sentRevision) return;
          sentRevision = event.revision;
        } else {
          stopped = true;
        }
        onEvent(event);
      };

      try {
        // Subscribe BEFORE checking catch-up revision so no concurrent update falls between.
        await bus.subscribe(
          id,
          (event) => {
            if (stopped || signal.aborted) return;
            if (!ready) buffered.push(event);
            else deliver(event);
          },
          signal,
          onDisconnect,
        );

        try {
          const current = await sessions.load(id);
          if (!stopped && !signal.aborted && current.revision > sentRevision) {
            deliver({ type: "updated", revision: current.revision });
          }
        } catch (error) {
          if (error instanceof SessionError && error.code === "NOT_FOUND") {
            deliver({ type: "deleted", sessionId: id });
          } else {
            throw error;
          }
        }

        ready = true;
        for (const event of buffered) {
          if (stopped || signal.aborted) break;
          deliver(event);
        }
        buffered.length = 0;
      } catch (error) {
        signal.removeEventListener("abort", stop);
        throw error;
      }
    },
  };
}
