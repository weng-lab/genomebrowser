import { Clock, Deferred, Effect, Latch, Queue, Result, Semaphore } from "effect";
import { parseJson } from "../../shared/parseJson";
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

type LocalSnapshot =
  | { tag: "valid"; doc: SessionDocument; key: string }
  | { tag: "unserializable" };

type PendingPatch = {
  bodyKey: string;
  input: SessionDocument;
  patch: SessionPatch;
  saveId: string;
};

type WritePhase =
  | { tag: "saved" }
  | { tag: "dirty"; editedAt: number }
  | { tag: "writing"; pending: PendingPatch; failures: number; editedAt: number }
  | {
      tag: "retrying";
      pending: PendingPatch;
      failures: number;
      retryAt: number;
      editedAt: number;
      failure: SessionRequestError;
    }
  | { tag: "refused"; bodyKey: string | undefined; failure: SessionRequestError }
  | { tag: "conflict"; failure: SessionRequestError }
  | { tag: "ended"; failure: SessionRequestError };

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

function blockedError(phase: WritePhase): SessionRequestError | undefined {
  switch (phase.tag) {
    case "ended":
    case "conflict":
    case "refused":
      return phase.failure;
    case "saved":
    case "dirty":
    case "writing":
    case "retrying":
      return undefined;
  }
}

function statusOf(phase: WritePhase): { status: SaveStatus; failure?: SessionRequestError } {
  switch (phase.tag) {
    case "saved":
      return { status: "saved" };
    case "dirty":
      return { status: "saving" };
    case "writing":
      return { status: phase.failures > 0 ? "retrying" : "saving" };
    case "retrying":
      return { status: "retrying", failure: phase.failure };
    case "refused":
    case "ended":
      return { status: "failed", failure: phase.failure };
    case "conflict":
      return { status: "conflict", failure: phase.failure };
  }
}

function sameLocal(a: LocalSnapshot, b: LocalSnapshot): boolean {
  if (a.tag !== b.tag) return false;
  return a.tag === "unserializable" || (b.tag === "valid" && a.key === b.key);
}

/**
 * Synchronize one restored session with the server in the background until the
 * enclosing scope closes. Local edits to synced stores (including `browser.region`)
 * and name are debounced and sent as section patches (`PATCH`) so concurrent edits
 * across tabs or MCP agents merge cleanly. Remote updates arrive via lightweight
 * SSE revision hints followed by a coalesced session fetch.
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
  const readLocal = (): LocalSnapshot => {
    try {
      const doc = current();
      return { tag: "valid", doc, key: syncKey(doc) };
    } catch {
      return { tag: "unserializable" };
    }
  };

  // Last server-acknowledged document and revision.
  let syncedInput: SessionDocument = current();
  let savedKey = syncKey(syncedInput);
  let revision = options.revision;
  let targetRevision = options.revision;

  let local: LocalSnapshot = { tag: "valid", doc: syncedInput, key: savedKey };
  let phase: WritePhase = { tag: "saved" };
  // Read `phase` through a getter across `yield*` boundaries so TypeScript does not
  // keep stale control-flow narrowing while other fibers or SSE callbacks mutate it.
  const currentPhase = (): WritePhase => phase;
  const currentLocal = (): LocalSnapshot => local;
  let applyingRemote = false;

  let waiters: Deferred.Deferred<void, SessionRequestError>[] = [];
  const clock = yield* Clock.Clock;
  const edits = yield* Queue.sliding<void>(1);
  const syncRequests = yield* Queue.sliding<void>(1);
  const urgent = yield* Latch.make(false);
  const permit = yield* Semaphore.make(1);

  const nextPhaseFromLocal = (snapshotState: LocalSnapshot, editedAt: number): WritePhase => {
    if (snapshotState.tag === "unserializable") {
      return { tag: "refused", bodyKey: undefined, failure: unsaveable };
    }
    if (snapshotState.key === savedKey) return { tag: "saved" };
    return { tag: "dirty", editedAt };
  };

  function report() {
    const { status, failure } = statusOf(phase);
    onStatus(status, failure);
  }

  function settle(failure?: SessionRequestError) {
    const resolved = waiters;
    waiters = [];
    for (const waiter of resolved)
      Deferred.doneUnsafe(waiter, failure ? Effect.fail(failure) : Effect.void);
    urgent.closeUnsafe();
  }

  function endWith(failure: SessionRequestError) {
    if (phase.tag === "ended") return;
    phase = { tag: "ended", failure };
    settle(failure);
    report();
  }

  /** Record the stores' current synced state; schedule a write when it changed. */
  function changed() {
    if (phase.tag === "ended" || applyingRemote) return;
    const next = readLocal();
    if (sameLocal(next, local)) return;
    local = next;
    const now = clock.currentTimeMillisUnsafe();

    switch (phase.tag) {
      case "conflict":
        // Stay frozen in conflict until the user chooses overwrite or discard.
        break;
      case "writing":
      case "retrying":
        // Keep the unsettled PATCH active while tracking when newer local edits occurred.
        phase = { ...phase, editedAt: now };
        break;
      case "saved":
      case "dirty":
      case "refused":
        if (next.tag === "valid" && phase.tag === "refused" && phase.bodyKey === next.key) {
          break;
        }
        phase = nextPhaseFromLocal(next, now);
        break;
    }

    if (phase.tag === "saved") settle();
    report();
    if (phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
    if (next.tag === "valid" && phase.tag !== "conflict" && targetRevision > revision) {
      Queue.offerUnsafe(syncRequests, undefined);
    }
  }

  /**
   * Reconcile an incoming authoritative `SavedSession` (from a merged PATCH reply
   * or an SSE-triggered fetch) with any unpushed local edits so local work is
   * preserved.
   */
  function reconcileRemote(
    remote: SavedSession,
    baseForPending: SessionDocument,
    { fromWrite }: { fromWrite: boolean },
  ) {
    if (phase.tag === "ended" || phase.tag === "conflict") return;

    const liveLocal = readLocal();
    if (liveLocal.tag === "unserializable") {
      // Do not overwrite unsaveable local work; defer reconciliation until local stores serialize.
      local = liveLocal;
      if (remote.revision > targetRevision) targetRevision = remote.revision;
      if (fromWrite || (phase.tag !== "writing" && phase.tag !== "retrying")) {
        phase = { tag: "refused", bodyKey: undefined, failure: unsaveable };
      }
      settle(unsaveable);
      report();
      return;
    }

    if (remote.revision < revision) {
      if (fromWrite && phase.tag === "writing") {
        phase = nextPhaseFromLocal(local, phase.editedAt);
      }
      if (phase.tag === "saved") settle();
      else if (phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
      report();
      return;
    }

    const pendingLocal = diffSessionPatch(baseForPending, liveLocal.doc);

    revision = remote.revision;
    if (targetRevision < revision) targetRevision = revision;
    syncedInput = { name: remote.name, snapshot: remote.snapshot };
    savedKey = syncKey(syncedInput);

    const target = pendingLocal ? applySessionPatch(syncedInput, pendingLocal) : syncedInput;
    applyingRemote = true;
    try {
      applyRemoteSnapshot(stores, target.snapshot);
      if (target.name !== options.name()) onRemoteRename?.(target.name);
      const reconciled = current();
      const reconciledKey = syncKey(reconciled);
      local = { tag: "valid", doc: reconciled, key: reconciledKey };
      if (!pendingLocal) {
        syncedInput = reconciled;
        savedKey = reconciledKey;
      }
    } finally {
      applyingRemote = false;
    }

    if (fromWrite || (phase.tag !== "writing" && phase.tag !== "retrying")) {
      const editedAt =
        phase.tag === "writing" || phase.tag === "dirty"
          ? phase.editedAt
          : clock.currentTimeMillisUnsafe();
      if (!pendingLocal || (local.tag === "valid" && local.key === savedKey)) {
        phase = { tag: "saved" };
      } else if (phase.tag === "refused" && local.tag === "valid" && phase.bodyKey === local.key) {
        // Keep refused when remote changes did not alter the refused local state.
      } else {
        phase = { tag: "dirty", editedAt };
      }
    }

    const { snapshot: _snapshot, ...metadata } = remote;
    onSaved(metadata);
    if (phase.tag === "saved") settle();
    else if (phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
    report();
  }

  const write = Effect.gen(function* () {
    if (phase.tag === "ended" || phase.tag === "conflict" || phase.tag === "refused") {
      return settle(phase.failure);
    }
    if (phase.tag === "saved" || phase.tag === "writing") return settle();

    let pending: PendingPatch;
    let failures: number;
    let editedAt: number;

    if (phase.tag === "retrying") {
      pending = phase.pending;
      failures = phase.failures;
      editedAt = phase.editedAt;
    } else {
      if (local.tag !== "valid") {
        phase = { tag: "refused", bodyKey: undefined, failure: unsaveable };
        settle(unsaveable);
        return report();
      }
      if (local.key === savedKey) {
        phase = { tag: "saved" };
        settle();
        return report();
      }
      const patch = diffSessionPatch(syncedInput, local.doc);
      if (!patch) {
        savedKey = local.key;
        phase = { tag: "saved" };
        settle();
        return report();
      }
      pending = {
        bodyKey: local.key,
        input: local.doc,
        patch,
        saveId: crypto.randomUUID(),
      };
      failures = 0;
      editedAt = phase.editedAt;
    }

    phase = { tag: "writing", pending, failures, editedAt };
    report();

    const result = yield* Effect.result(
      transport.patch(id, { clientId, saveId: pending.saveId, patch: pending.patch }),
    );
    const activePhase = currentPhase();
    if (activePhase.tag !== "writing" || activePhase.pending !== pending) return;

    if (Result.isSuccess(result)) {
      reconcileRemote(result.success, pending.input, { fromWrite: true });
      return;
    }

    const failure = result.failure;
    if (failure.code === "UNAVAILABLE") {
      // The write may have been applied, so it stays unsettled and retries with the same saveId.
      const nextFailures = activePhase.failures + 1;
      phase = {
        tag: "retrying",
        pending,
        failures: nextFailures,
        retryAt: clock.currentTimeMillisUnsafe() + retryDelay(nextFailures),
        editedAt: activePhase.editedAt,
        failure,
      };
      Queue.offerUnsafe(edits, undefined);
    } else if (failure.code === "INVALID_INPUT") {
      // Edits made during the write may be saveable.
      if (local.tag === "valid" && local.key !== pending.bodyKey) {
        phase = nextPhaseFromLocal(local, activePhase.editedAt);
        if (phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
      } else {
        phase = { tag: "refused", bodyKey: pending.bodyKey, failure };
      }
    } else if (failure.code === "CONFLICT") {
      phase = { tag: "conflict", failure };
    } else {
      phase = { tag: "ended", failure };
    }

    settle(failure);
    report();
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
      while (currentPhase().tag !== "ended") {
        yield* Queue.take(syncRequests);
        while (
          currentPhase().tag !== "ended" &&
          currentPhase().tag !== "conflict" &&
          currentLocal().tag === "valid" &&
          targetRevision > revision
        ) {
          const loaded = yield* Effect.result(transport.load(id));
          const latestPhase = currentPhase();
          if (
            latestPhase.tag === "ended" ||
            latestPhase.tag === "conflict" ||
            currentLocal().tag !== "valid"
          ) {
            break;
          }
          if (Result.isFailure(loaded)) {
            if (loaded.failure.code === "NOT_FOUND") {
              endWith(loaded.failure);
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
            reconcileRemote(remote, syncedInput, { fromWrite: false });
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
        let streamErrored = false;
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
              if (!active || phase.tag === "ended") return;
              streamFailures = 0;
              const parsed = sessionEventSchema.safeParse(parseJson(message.data));
              if (!parsed.success || parsed.data.type !== "updated") return;
              const { revision: incomingRevision, sourceClientId } = parsed.data;
              if (sourceClientId === clientId || incomingRevision <= revision) return;
              if (incomingRevision > targetRevision) {
                targetRevision = incomingRevision;
                if (phase.tag !== "conflict" && local.tag === "valid") {
                  Queue.offerUnsafe(syncRequests, undefined);
                }
              }
            });
            source.addEventListener("deleted", (message: MessageEvent<string>) => {
              if (!active || phase.tag === "ended") return;
              const parsed = sessionEventSchema.safeParse(parseJson(message.data));
              if (!parsed.success || parsed.data.type !== "deleted") return;
              endWith(
                new SessionRequestError({
                  code: "NOT_FOUND",
                  message: "Session not found",
                }),
              );
              restart();
            });
            source.onerror = () => {
              if (!active) return;
              streamErrored = true;
              restart();
            };
            yield* Deferred.await(reconnect);
          }),
        );
        if (currentPhase().tag === "ended") return yield* Effect.never;
        if (streamErrored) {
          // EventSource hides HTTP status codes (e.g. 404 after deletion while offline,
          // or 401 after sign-out). Revalidate so terminal failures stop reconnecting.
          const check = yield* Effect.result(transport.load(id));
          if (currentPhase().tag === "ended") return yield* Effect.never;
          if (Result.isFailure(check)) {
            if (check.failure.code === "NOT_FOUND" || check.failure.code === "UNAUTHENTICATED") {
              endWith(check.failure);
              return yield* Effect.never;
            }
          } else if (check.success.revision > revision) {
            if (currentPhase().tag !== "conflict" && currentLocal().tag === "valid") {
              reconcileRemote(check.success, syncedInput, { fromWrite: false });
            } else if (check.success.revision > targetRevision) {
              targetRevision = check.success.revision;
            }
          }
        }
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
      while (currentPhase().tag !== "ended") {
        yield* Queue.take(edits);
        // A later edit restarts the quiet period, but never changes the retry deadline.
        let changedDuringDelay: boolean;
        do {
          const currentWritePhase = currentPhase();
          const due =
            currentWritePhase.tag === "retrying"
              ? currentWritePhase.retryAt
              : currentWritePhase.tag === "dirty"
                ? currentWritePhase.editedAt + editDelay
                : clock.currentTimeMillisUnsafe();
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
      return phase.tag !== "saved";
    },
    /**
     * Write every synced edit made so far without waiting for the edit delay.
     * Fails if a write fails, and at once when the latest edits cannot be saved.
     */
    flush: Effect.suspend(() => {
      changed();
      const blocked = blockedError(phase);
      if (blocked) return Effect.fail(blocked);
      if (phase.tag === "saved") return Effect.void;
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
      if (phase.tag === "dirty" || phase.tag === "retrying") Queue.offerUnsafe(edits, undefined);
    }),
    overwrite: Effect.gen(function* () {
      const resolving = currentPhase();
      if (resolving.tag !== "conflict") return;
      const loaded = yield* Effect.result(transport.load(id));
      if (currentPhase() !== resolving) return;
      if (Result.isFailure(loaded)) {
        if (loaded.failure.code !== "UNAVAILABLE") {
          phase = { tag: "ended", failure: loaded.failure };
          report();
        }
        return yield* Effect.fail(loaded.failure);
      }
      revision = loaded.success.revision;
      targetRevision = Math.max(targetRevision, revision);
      syncedInput = { name: loaded.success.name, snapshot: loaded.success.snapshot };
      savedKey = syncKey(syncedInput);
      local = readLocal();
      phase = nextPhaseFromLocal(local, clock.currentTimeMillisUnsafe());
      report();
      if (phase.tag === "dirty") {
        urgent.openUnsafe();
        Queue.offerUnsafe(edits, undefined);
      } else if (phase.tag === "saved") {
        settle();
      }
      if (targetRevision > revision) Queue.offerUnsafe(syncRequests, undefined);
    }),
  };
});

export type Autosave = Effect.Success<ReturnType<typeof startAutosave>>;
