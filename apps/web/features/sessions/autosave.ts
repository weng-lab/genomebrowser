import type { GenomeBrowserStores } from "@weng-lab/genomebrowser";
import { Clock, Deferred, Effect, Latch, Queue, Result, Semaphore } from "effect";
import { snapshot } from "./storeSnapshot";
import type { Session, SessionInput } from "./schema";
import { SessionRequestError, type SessionTransport } from "./transport";

/**
 * `saving` while edits are unsaved or a write is outstanding, `retrying` after a
 * write failed transiently, `conflict` after another save, and `failed` while the
 * latest edits cannot be saved. Edits that were refused, for example for
 * exceeding the size limit, can be changed so that they save. A session deleted
 * elsewhere can no longer be saved.
 */
export type SaveStatus = "saved" | "saving" | "retrying" | "conflict" | "failed";

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
  revision: number;
  stores: GenomeBrowserStores;
  name: () => string;
  transport: SessionTransport;
  onStatus: (status: SaveStatus, failure?: SessionRequestError) => void;
  /** The server's metadata after each acknowledged write. */
  onSaved: (session: Session) => void;
}) {
  const { id, stores, transport, onStatus, onSaved } = options;
  const current = (): SessionInput => ({ name: options.name(), snapshot: snapshot(stores) });
  // JSON of the last acknowledged input, unknown after a conflict, and of the newest edits.
  let saved: string | undefined = JSON.stringify(current());
  let latest = saved;
  let revision = options.revision;
  // Retried unchanged until the server applies or rejects it.
  let unsettled: { body: string; revision: number; saveId: string } | undefined;
  let failures = 0;
  // Edits the server or serialization refused. They are not written again.
  let refused: { body: string; failure: SessionRequestError } | undefined;
  let conflict: SessionRequestError | undefined;
  let ended: SessionRequestError | undefined;
  let waiters: Deferred.Deferred<void, SessionRequestError>[] = [];
  const clock = yield* Clock.Clock;
  let editedAt = clock.currentTimeMillisUnsafe();
  let retryAt = editedAt;
  const edits = yield* Queue.sliding<void>(1);
  const urgent = yield* Latch.make(false);
  const permit = yield* Semaphore.make(1);

  /** Why the newest edits cannot be saved, if they cannot. */
  const unsaved = () =>
    ended ?? conflict ?? (refused?.body === latest ? refused.failure : undefined);
  const settled = () => !unsettled && latest === saved;

  function report(failure?: SessionRequestError) {
    const blocked = unsaved();
    if (blocked) onStatus(blocked === conflict ? "conflict" : "failed", blocked);
    else if (settled()) {
      failures = 0;
      onStatus("saved");
    } else if (failure || failures > 0) onStatus("retrying", failure);
    else onStatus("saving");
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
    editedAt = clock.currentTimeMillisUnsafe();
    if (settled() && !unsaved()) settle();
    report();
    Queue.offerUnsafe(edits, undefined);
  }

  const write = Effect.gen(function* () {
    if (ended) return settle(ended);
    if (!unsettled) {
      const blocked = unsaved();
      if (blocked || latest === saved) return settle(blocked);
      unsettled = { body: latest, revision, saveId: crypto.randomUUID() };
    }
    const { body, ...base } = unsettled;
    report();
    const result = yield* Effect.result(transport.update(id, { ...JSON.parse(body), ...base }));
    if (Result.isSuccess(result)) {
      unsettled = undefined;
      saved = body;
      revision = result.success.revision;
      failures = 0;
      onSaved(result.success);
      if (latest === saved) settle();
      else Queue.offerUnsafe(edits, undefined);
      return report();
    }
    const failure = result.failure;
    if (failure.code === "UNAVAILABLE") {
      // The write may have been applied, so it stays unsettled.
      failures += 1;
      retryAt = clock.currentTimeMillisUnsafe() + retryDelay(failures);
      Queue.offerUnsafe(edits, undefined);
    } else {
      // Any other failure means the server did not apply it.
      unsettled = undefined;
      failures = 0;
      if (failure.code === "INVALID_INPUT") {
        refused = { body, failure };
        // Edits made during the write may be saveable.
        if (latest !== body) Queue.offerUnsafe(edits, undefined);
      } else if (failure.code === "CONFLICT") {
        // What the server now holds is unknown, so no edit counts as saved.
        conflict = failure;
        saved = undefined;
      } else {
        ended = failure;
      }
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
        // A later edit restarts the quiet period, but never changes the retry
        // deadline.
        let changedDuringDelay: boolean;
        do {
          const due = failures > 0 ? retryAt : editedAt + editDelay;
          changedDuringDelay = yield* Effect.raceFirst(
            Effect.as(Queue.take(edits), true),
            Effect.as(
              Effect.raceFirst(
                Effect.sleep(Math.max(0, due - clock.currentTimeMillisUnsafe())),
                urgent.await,
              ),
              false,
            ),
          );
        } while (changedDuringDelay);
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
      return unsaved() !== undefined || !settled();
    },
    /**
     * Write every edit made so far without waiting for the edit delay. Fails if a
     * write fails, and at once when the latest edits cannot be saved.
     */
    flush: Effect.suspend(() => {
      changed();
      const blocked = unsaved();
      if (blocked) return Effect.fail(blocked);
      if (settled()) return Effect.void;
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
      if (!settled()) Queue.offerUnsafe(edits, undefined);
    }),
    overwrite: Effect.gen(function* () {
      const resolving = conflict;
      if (!resolving || ended) return;
      const loaded = yield* Effect.result(transport.load(id));
      // Another call resolved the conflict meanwhile, and its write may already be
      // acknowledged at a newer revision than this one loaded.
      if (conflict !== resolving || ended) return;
      if (Result.isFailure(loaded)) {
        if (loaded.failure.code !== "UNAVAILABLE") {
          ended = loaded.failure;
          report();
        }
        return yield* Effect.fail(loaded.failure);
      }
      revision = loaded.success.revision;
      conflict = undefined;
      changed();
      report();
      urgent.openUnsafe();
      Queue.offerUnsafe(edits, undefined);
    }),
  };
});

export type Autosave = Effect.Success<ReturnType<typeof startAutosave>>;
