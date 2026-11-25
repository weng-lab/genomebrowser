import { Clock, Deferred, Effect, Latch, Queue, Result, Semaphore } from "effect";
import type { SessionStores } from "../browser/regions/regionGroups";
import { applyRemoteSnapshot, snapshot } from "./storeSnapshot";
import type { SavedSession, Session } from "./schema";
import {
  applySessionPatch,
  diffSessionPatch,
  sessionEventSchema,
  syncKey,
  type SessionDocument,
  type SessionPatch,
} from "./syncSchema";
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
/** Exponential backoff with ±20% jitter for SSE reconnects, capped at 30s. */
const streamRetryDelay = (failures: number) => {
  const base = Math.min(1000 * 2 ** Math.max(0, failures - 1), 30_000);
  const jitter = base * 0.2 * (Math.random() * 2 - 1);
  return Math.max(250, Math.round(base + jitter));
};
const unsaveable = new SessionRequestError({
  code: "INVALID_INPUT",
  message: "The latest changes cannot be saved",
});
/** Stands for edits that cannot be serialized. No snapshot serializes to it. */
const unserializable = "";

/**
 * Synchronize one restored session with the server in the background until the
 * enclosing scope closes. Local edits to synced stores and name are debounced
 * and sent as section patches (`PATCH`) so concurrent edits across tabs or MCP
 * agents merge cleanly. Local viewport pans (`browser.region`) stay tab-local;
 * explicit server-side region changes (such as MCP `set_region`) arrive via
 * lightweight SSE revision hints followed by a coalesced session fetch.
 */
export const startAutosave = Effect.fnUntraced(function* (options: {
  id: string;
  revision: number;
  stores: SessionStores;
  name: () => string;
  transport: SessionTransport;
  onStatus: (status: SaveStatus, failure?: SessionRequestError) => void;
  /** The server's metadata after each acknowledged write or remote update. */
  onSaved: (session: Session) => void;
  /** Called when another tab or agent renames the open session. */
  onRemoteRename?: (name: string) => void;
  /** Whether to subscribe to live SSE updates. Defaults to `typeof EventSource !== "undefined"`. */
  liveSync?: boolean;
}) {
  const { id, stores, transport, onStatus, onSaved, onRemoteRename } = options;
  const clientId = crypto.randomUUID();
  const current = (): SessionDocument => ({ name: options.name(), snapshot: snapshot(stores) });

  // Last server-acknowledged document (including the server's last known `browser.region`).
  let syncedInput: SessionDocument = current();
  // Canonical synced-fields key of `syncedInput` (undefined after a conflict) and of the newest edits.
  let saved: string | undefined = syncKey(syncedInput);
  let latest = saved;
  let latestInput: SessionDocument | undefined = syncedInput;
  let revision = options.revision;
  let targetRevision = options.revision;
  let applyingRemote = false;

  // Retried unchanged until the server applies or rejects it.
  let unsettled:
    | { body: string; input: SessionDocument; patch: SessionPatch; saveId: string }
    | undefined;
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
  const syncRequests = yield* Queue.sliding<void>(1);
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
    const resolved = waiters;
    waiters = [];
    for (const waiter of resolved)
      Deferred.doneUnsafe(waiter, failure ? Effect.fail(failure) : Effect.void);
    urgent.closeUnsafe();
  }

  /** Record the stores' current synced state; schedule a write when it changed. */
  function changed() {
    if (ended || applyingRemote) return;
    let next: string;
    let nextInput: SessionDocument | undefined;
    try {
      nextInput = current();
      next = syncKey(nextInput);
    } catch {
      next = unserializable;
      nextInput = undefined;
      refused = { body: next, failure: unsaveable };
    }
    if (next === latest) return;
    latest = next;
    latestInput = nextInput;
    editedAt = clock.currentTimeMillisUnsafe();
    if (settled() && !unsaved()) settle();
    report();
    Queue.offerUnsafe(edits, undefined);
  }

  /**
   * Reconcile an incoming authoritative `SavedSession` (from a merged PATCH reply
   * or an SSE-triggered fetch) with any unpushed local edits so local work is
   * preserved. Updates the tab's viewport only when the server's `browser.region`
   * itself changed (for example, via MCP `set_region`).
   */
  function applyAuthoritative(remote: SavedSession, baseForPending: SessionDocument) {
    if (remote.revision < revision) {
      if (settled() && !unsaved()) settle();
      else if (!unsettled && latest !== saved) Queue.offerUnsafe(edits, undefined);
      report();
      return;
    }

    let pendingLocal: SessionPatch | undefined;
    try {
      pendingLocal = diffSessionPatch(baseForPending, current());
    } catch {
      pendingLocal = undefined;
    }

    const serverRegionChanged = !jsonEqual(
      syncedInput.snapshot.browser.region,
      remote.snapshot.browser.region,
    );

    revision = remote.revision;
    if (targetRevision < revision) targetRevision = revision;
    syncedInput = { name: remote.name, snapshot: remote.snapshot };
    saved = syncKey(syncedInput);

    const target = pendingLocal ? applySessionPatch(syncedInput, pendingLocal) : syncedInput;
    applyingRemote = true;
    try {
      applyRemoteSnapshot(stores, target.snapshot, { applyRegion: serverRegionChanged });
      if (target.name !== options.name()) onRemoteRename?.(target.name);
      const reconciled = current();
      latestInput = reconciled;
      latest = syncKey(reconciled);
      if (!pendingLocal) {
        syncedInput = {
          name: reconciled.name,
          snapshot: {
            ...reconciled.snapshot,
            browser: {
              ...reconciled.snapshot.browser,
              region: remote.snapshot.browser.region,
            },
          },
        };
        saved = latest;
      }
    } finally {
      applyingRemote = false;
    }

    const { snapshot: _snapshot, ...metadata } = remote;
    onSaved(metadata);
    if (settled() && !unsaved()) settle();
    else if (pendingLocal) Queue.offerUnsafe(edits, undefined);
    report();
  }

  const write = Effect.gen(function* () {
    if (ended) return settle(ended);
    if (!unsettled) {
      const blocked = unsaved();
      if (blocked || latest === saved || !latestInput) return settle(blocked);
      const patch = diffSessionPatch(syncedInput, latestInput);
      if (!patch) {
        saved = latest;
        settle();
        return report();
      }
      unsettled = {
        body: latest,
        input: latestInput,
        patch,
        saveId: crypto.randomUUID(),
      };
    }
    const pending = unsettled;
    report();
    const result = yield* Effect.result(
      transport.patch(id, { clientId, saveId: pending.saveId, patch: pending.patch }),
    );
    if (Result.isSuccess(result)) {
      unsettled = undefined;
      failures = 0;
      applyAuthoritative(result.success, pending.input);
      return;
    }
    const failure = result.failure;
    if (failure.code === "UNAVAILABLE") {
      // The write may have been applied, so it stays unsettled and retries with the same saveId.
      failures += 1;
      retryAt = clock.currentTimeMillisUnsafe() + retryDelay(failures);
      Queue.offerUnsafe(edits, undefined);
    } else {
      // Any other failure means the server did not apply it.
      unsettled = undefined;
      failures = 0;
      if (failure.code === "INVALID_INPUT") {
        refused = { body: pending.body, failure };
        // Edits made during the write may be saveable.
        if (latest !== pending.body) Queue.offerUnsafe(edits, undefined);
      } else if (failure.code === "CONFLICT") {
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
      stores.useRegionGroupStore.subscribe(changed),
    ]),
    (subscriptions) => Effect.sync(() => subscriptions.forEach((unsubscribe) => unsubscribe())),
  );

  // Live SSE sync: receives lightweight revision hints from other clients and MCP tools,
  // then fetches the latest session state via a coalesced single-flight loop.
  const enableLiveSync = options.liveSync ?? typeof EventSource !== "undefined";
  if (enableLiveSync && typeof EventSource !== "undefined") {
    let streamFailures = 0;
    const syncLoop = Effect.gen(function* () {
      while (!ended) {
        yield* Queue.take(syncRequests);
        while (!ended && targetRevision > revision) {
          const loaded = yield* Effect.result(transport.load(id));
          if (ended) break;
          if (Result.isFailure(loaded)) {
            if (loaded.failure.code === "NOT_FOUND") {
              ended = loaded.failure;
              unsettled = undefined;
              settle(ended);
              report(ended);
              break;
            }
            if (loaded.failure.code === "UNAVAILABLE") {
              yield* Effect.sleep(1000);
              continue;
            }
            break;
          }
          const remote = loaded.success;
          if (remote.revision > revision) {
            // Rebase all unacknowledged local edits (including any in-flight PATCH) onto remote.
            applyAuthoritative(remote, syncedInput);
          }
          if (remote.revision >= targetRevision) break;
        }
      }
    });
    yield* Effect.forkScoped(syncLoop);

    const streamLoop = Effect.forever(
      Effect.gen(function* () {
        const reconnect = yield* Deferred.make<void>();
        const restart = () => Deferred.doneUnsafe(reconnect, Effect.void);
        yield* Effect.scoped(
          Effect.gen(function* () {
            let active = true;
            const source = yield* Effect.acquireRelease(
              Effect.sync(() => new EventSource(transport.eventsUrl(id, revision))),
              (eventSource) =>
                Effect.sync(() => {
                  active = false;
                  eventSource.close();
                }),
            );
            source.onopen = () => {
              if (active) streamFailures = 0;
            };
            source.addEventListener("updated", (message: MessageEvent<string>) => {
              if (!active || ended) return;
              streamFailures = 0;
              const parsed = sessionEventSchema.safeParse(parseJson(message.data));
              if (!parsed.success || parsed.data.type !== "updated") return;
              const { revision: incomingRevision, sourceClientId } = parsed.data;
              if (sourceClientId === clientId || incomingRevision <= revision) return;
              if (incomingRevision > targetRevision) {
                targetRevision = incomingRevision;
                Queue.offerUnsafe(syncRequests, undefined);
              }
            });
            source.addEventListener("deleted", (message: MessageEvent<string>) => {
              if (!active || ended) return;
              const parsed = sessionEventSchema.safeParse(parseJson(message.data));
              if (!parsed.success || parsed.data.type !== "deleted") return;
              ended = new SessionRequestError({
                code: "NOT_FOUND",
                message: "Session not found",
              });
              unsettled = undefined;
              settle(ended);
              report(ended);
              restart();
            });
            source.onerror = restart;
            yield* Deferred.await(reconnect);
          }),
        );
        if (ended) return yield* Effect.never;
        streamFailures += 1;
        // Wake immediately if the browser comes back online during backoff.
        const online = Effect.callback<void>((resume) => {
          if (typeof window === "undefined") return;
          const wake = () => resume(Effect.void);
          window.addEventListener("online", wake, { once: true });
          return Effect.sync(() => window.removeEventListener("online", wake));
        });
        yield* Effect.raceFirst(Effect.sleep(streamRetryDelay(streamFailures)), online);
      }),
    );
    yield* Effect.forkScoped(streamLoop);
  }

  yield* Effect.forkScoped(
    Effect.gen(function* () {
      while (!ended) {
        yield* Queue.take(edits);
        // A later edit restarts the quiet period, but never changes the retry deadline.
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
     * Whether any synced edit is not yet acknowledged, including the patch being
     * written and edits that cannot be saved.
     */
    dirty() {
      changed();
      return unsaved() !== undefined || !settled();
    },
    /**
     * Write every synced edit made so far without waiting for the edit delay.
     * Fails if a write fails, and at once when the latest edits cannot be saved.
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
      if (conflict !== resolving || ended) return;
      if (Result.isFailure(loaded)) {
        if (loaded.failure.code !== "UNAVAILABLE") {
          ended = loaded.failure;
          report();
        }
        return yield* Effect.fail(loaded.failure);
      }
      revision = loaded.success.revision;
      targetRevision = Math.max(targetRevision, revision);
      syncedInput = { name: loaded.success.name, snapshot: loaded.success.snapshot };
      conflict = undefined;
      changed();
      report();
      urgent.openUnsafe();
      Queue.offerUnsafe(edits, undefined);
    }),
  };
});

export type Autosave = Effect.Success<ReturnType<typeof startAutosave>>;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
