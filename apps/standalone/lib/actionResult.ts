/** Outcome of a server operation called from the client. Failures carry a user-facing message. */
export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; retryable?: boolean };
