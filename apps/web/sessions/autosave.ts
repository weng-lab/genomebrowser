import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { Deferred, Effect, Latch, Queue, Result, Semaphore } from "effect";
import { snapshot } from "../browser/snapshot";
import type { Session, SessionInput } from "./schema";
import { SessionRequestError, type SessionTransport } from "./transport";

/**
 * `saving` while edits are unsaved or a write is outstanding, `retrying` after a
 * write failed transiently, and `failed` while the latest edits cannot be saved.
 * Edits that were refused, for example for exceeding the size limit, can be
 * changed so that they save. A session deleted elsewhere can no longer be saved.
 */
export type SaveStatus = "saved" | "saving" | "retrying" | "failed";

/** Delay after an edit before writing it, so a burst of edits is saved once. */
const editDelay = 200;
const retryDelay = (failures: number) => Math.min(1000 * 2 ** (failures - 1), 10_000);
const unsaveable = new SessionRequestError({
  code: "INVALID_INPUT",
  message: "The latest changes cannot be saved",
});
/** Stands for edits that cannot be serialized. No snapshot serializes to it. */
const unserializable = "";

/**
 * Save one restored session in the background until the enclosing scope closes.
 * Edits to its stores and name are written as whole snapshots, one write at a
 * time; edits made during a write are saved by the next one. A write is
 * acknowledged only for the snapshot it sent. Transient failures retry with
 * backoff. Refused edits wait for a further edit. Other failures, including
 * `NOT_FOUND` after deletion, end saving; the edits stay unsaved.
 */
export const startAutosave = Effect.fnUntraced(function* (options: {
  id: string;
  stores: GenomeBrowserStores;
  name: () => string;
  transport: SessionTransport;
  onStatus: (status: SaveStatus, failure?: SessionRequestError) => void;
  /** The server's metadata after each acknowledged write. */
  onSaved: (session: Session) => void;
}) {
  const { id, stores, transport, onStatus, onSaved } = options;
  const current = (): SessionInput => ({ name: options.name(), snapshot: snapshot(stores) });
  // JSON of the input last acknowledged, and of the newest edits.
  let saved = JSON.stringify(current());
  let latest = saved;
  let writing = false;
  let failures = 0;
  // Edits the server or serialization refused. They are not written again.
  let refused: { body: string; failure: SessionRequestError } | undefined;
  let ended: SessionRequestError | undefined;
  let waiters: Deferred.Deferred<void, SessionRequestError>[] = [];
  const edits = yield* Queue.sliding<void>(1);
  const urgent = yield* Latch.make(false);
  const permit = yield* Semaphore.make(1);

  /** Why the newest edits cannot be saved, if they cannot. */
  const unsaved = () => ended ?? (refused?.body === latest ? refused.failure : undefined);

  function report(failure?: SessionRequestError) {
    const blocked = unsaved();
    if (blocked) onStatus("failed", blocked);
    else if (failure || failures > 0) onStatus("retrying", failure);
    else onStatus(writing || latest !== saved ? "saving" : "saved");
  }

  function settle(failure?: SessionRequestError) {
    const settled = waiters;
    waiters = [];
    for (const waiter of settled)
      Deferred.doneUnsafe(waiter, failure ? Effect.fail(failure) : Effect.void);
    urgent.closeUnsafe();
  }

  /** Record the stores' current state; schedule a write when it changed. */
  function changed() {
    if (ended) return;
    let next: string;
    try {
      next = JSON.stringify(current());
    } catch {
      next = unserializable;
      refused = { body: next, failure: unsaveable };
    }
    if (next === latest) return;
    latest = next;
    report();
    Queue.offerUnsafe(edits, undefined);
  }

  const write = Effect.gen(function* () {
    const blocked = unsaved();
    if (blocked || latest === saved) return settle(blocked);
    const body = latest;
    writing = true;
    report();
    const result = yield* Effect.result(transport.update(id, JSON.parse(body)));
    writing = false;
    if (Result.isSuccess(result)) {
      saved = body;
      failures = 0;
      onSaved(result.success);
      if (latest === saved) settle();
      else Queue.offerUnsafe(edits, undefined);
      return report();
    }
    const failure = result.failure;
    if (failure.code === "UNAVAILABLE") {
      failures += 1;
      Queue.offerUnsafe(edits, undefined);
    } else if (failure.code === "INVALID_INPUT") {
      failures = 0;
      refused = { body, failure };
      // Edits made during the write may be saveable.
      if (latest !== body) Queue.offerUnsafe(edits, undefined);
    } else {
      ended = failure;
    }
    settle(failure);
    report(failure);
  });

  yield* Effect.acquireRelease(
    Effect.sync(() => [
      stores.useBrowserStore.subscribe(changed),
      stores.useTrackStore.subscribe(changed),
    ]),
    (subscriptions) => Effect.sync(() => subscriptions.forEach((unsubscribe) => unsubscribe())),
  );
  yield* Effect.forkScoped(
    Effect.gen(function* () {
      while (!ended) {
        yield* Queue.take(edits);
        const delay = failures > 0 ? retryDelay(failures) : editDelay;
        yield* Effect.raceFirst(Effect.sleep(delay), urgent.await);
        yield* permit.withPermits(1)(write);
      }
    }),
  );

  return {
    /** Save the session's new name with its next write. */
    renamed: changed,
    /**
     * Whether any edit is not yet acknowledged, including the snapshot being
     * written and edits that cannot be saved.
     */
    dirty() {
      changed();
      return ended !== undefined || writing || latest !== saved;
    },
    /**
     * Write every edit made so far without waiting for the edit delay. Fails if a
     * write fails, and at once when the latest edits cannot be saved.
     */
    flush: Effect.suspend(() => {
      changed();
      const blocked = unsaved();
      if (blocked) return Effect.fail(blocked);
      if (!writing && latest === saved) return Effect.void;
      const waiter = Deferred.makeUnsafe<void, SessionRequestError>();
      waiters.push(waiter);
      urgent.openUnsafe();
      Queue.offerUnsafe(edits, undefined);
      return Deferred.await(waiter);
    }),
    /** Wait for a write in progress, then hold further writes until `resume`. */
    pause: Effect.asVoid(permit.take(1)),
    resume: Effect.gen(function* () {
      yield* permit.release(1);
      changed();
      if (latest !== saved) Queue.offerUnsafe(edits, undefined);
    }),
  };
});

export type Autosave = Effect.Success<ReturnType<typeof startAutosave>>;
