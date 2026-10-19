import { Data, Effect } from "effect";
import { z } from "zod";
import {
  savedSessionSchema,
  sessionErrorSchema,
  sessionSchema,
  type SessionErrorCode,
  type SessionInput,
} from "./schema";

/**
 * A failed session request. `UNAVAILABLE` covers network failures, server errors,
 * and unexpected responses; retrying may succeed. Every other code is final.
 */
export class SessionRequestError extends Data.TaggedError("SessionRequestError")<{
  code: SessionErrorCode | "UNAVAILABLE";
  message: string;
}> {}

const unavailable = () =>
  new SessionRequestError({ code: "UNAVAILABLE", message: "Saved sessions are unavailable" });

/**
 * The saved-session routes of this app, as Effects. Interrupting a request
 * aborts it, including reading its response body.
 */
export function createSessionTransport(base = "/api/sessions") {
  function request<A>(path: string, schema: z.ZodType<A>, init: RequestInit = {}) {
    return Effect.tryPromise({
      try: async (signal) => {
        const response = await fetch(`${base}${path}`, {
          ...init,
          cache: "no-store",
          headers: init.body ? { "Content-Type": "application/json" } : undefined,
          signal,
        });
        const body: unknown = response.status === 204 ? null : await response.json();
        return { response, body };
      },
      catch: unavailable,
    }).pipe(
      Effect.flatMap(({ response, body }) => {
        if (!response.ok) {
          const rejected = sessionErrorSchema.safeParse(body);
          return Effect.fail(
            rejected.success && response.status < 500
              ? new SessionRequestError(rejected.data)
              : unavailable(),
          );
        }
        const parsed = schema.safeParse(body);
        return parsed.success ? Effect.succeed(parsed.data) : Effect.fail(unavailable());
      }),
    );
  }

  const json = (method: string, input: SessionInput) => ({ method, body: JSON.stringify(input) });
  return {
    /** The acting user's sessions, sorted by name. */
    list: () => request("", z.array(sessionSchema)),
    load: (id: string) => request(`/${encodeURIComponent(id)}`, savedSessionSchema),
    create: (input: SessionInput) => request("", sessionSchema, json("POST", input)),
    /** Fails with `NOT_FOUND` for a deleted session rather than recreating it. */
    update: (id: string, input: SessionInput) =>
      request(`/${encodeURIComponent(id)}`, sessionSchema, json("PUT", input)),
    remove: (id: string) => request(`/${encodeURIComponent(id)}`, z.null(), { method: "DELETE" }),
  };
}

export type SessionTransport = ReturnType<typeof createSessionTransport>;
