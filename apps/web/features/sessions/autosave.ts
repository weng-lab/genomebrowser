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
 * write failed transiently, `conflict` if concurrent server merge retries are
 * exhausted, and `failed` while the latest edits cannot be saved. Edits that
 * were refused, for example for exceeding the size limit, can be changed so that
 * they save. A session deleted elsewhere can no longer be saved.
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

function phaseFromLocal(local: LocalSnapshot, savedKey: string, editedAt: number): WritePhase {
  if (local.tag === "unserializable") {
    return { tag: "refused", bodyKey: undefined, failure: unsaveable };
  }
  return local.key === savedKey ? { tag: "saved" } : { tag: "dirty", editedAt };
}

function transitionLocalChange(
  phase: WritePhase,
  next: LocalSnapshot,
  savedKey: string,
  now: number,
): WritePhase {
  switch (phase.tag) {
    case "ended":
    case "conflict":
      return phase;
    case "writing":
    case "retrying":
      return { ...phase, editedAt: now };
    case "saved":
    case "dirty":
    case "refused":
      if (next.tag === "valid" && phase.tag === "refused" && phase.bodyKey === next.key) {
        return phase;
      }
      return phaseFromLocal(next, savedKey, now);
  }
}

function transitionWriteFailure(
  writing: Extract<WritePhase, { tag: "writing" }>,
  failure: SessionRequestError,
  local: LocalSnapshot,
  savedKey: string,
  now: number,
): WritePhase {
  if (failure.code === "UNAVAILABLE") {
    // The write may have been applied, so it stays unsettled and retries with the same saveId.
    const failures = writing.failures + 1;
    return {
      tag: "retrying",
      pending: writing.pending,
      failures,
      retryAt: now + retryDelay(failures),
      editedAt: writing.editedAt,
      failure,
    };
  }
  if (failure.code === "INVALID_INPUT") {
    // Edits made during the write may be saveable.
    if (local.tag === "valid" && local.key !== writing.pending.bodyKey) {
      return phaseFromLocal(local, savedKey, writing.editedAt);
    }
    return { tag: "refused", bodyKey: writing.pending.bodyKey, failure };
  }
  if (failure.code === "CONFLICT") return { tag: "conflict", failure };
  return { tag: "ended", failure };
}

function transitionAfterReconcile(
  phase: WritePhase,
  {
    hasPendingLocal,
    reconciledKey,
    savedKey,
    now,
  }: {
    hasPendingLocal: boolean;
    reconciledKey: string;
    savedKey: string;
    now: number;
  },
): WritePhase {
  if (!hasPendingLocal || reconciledKey === savedKey) return { tag: "saved" };
  if (phase.tag === "refused" && phase.bodyKey === reconciledKey) return phase;
  const editedAt = phase.tag === "writing" || phase.tag === "dirty" ? phase.editedAt : now;
  return { tag: "dirty", editedAt };
}

function isTerminalLoadError(error: SessionRequestError): boolean {
  return error.code === "NOT_FOUND" || error.code === "UNAUTHENTICATED";
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
}) {
  const { id, stores, transport, onStatus, onSaved, onRemoteRename } = options;
  const clientId = crypto.randomUUID();
  const currentDoc = (): SessionDocument => ({ name: options.name(), snapshot: snapshot(stores) });
  const readLocal = (): LocalSnapshot => {
    try {
      const doc = currentDoc();
      return { tag: "valid", doc, key: syncKey(doc) };
    } catch {
      return { tag: "unserializable" };
    }
  };

  const initialDoc = currentDoc();
  const initialKey = syncKey(initialDoc);
  const state: {
    syncedInput: SessionDocument;
    savedKey: string;
    revision: number;
    targetRevision: number;
    local: LocalSnapshot;
    phase: WritePhase;
    applyingRemote: boolean;
  } = {
    syncedInput: initialDoc,
    savedKey: initialKey,
    revision: options.revision,
    targetRevision: options.revision,
    local: { tag: "valid", doc: initialDoc, key: initialKey },
    phase: { tag: "saved" },
    applyingRemote: false,
  };

  let waiters: Deferred.Deferred<void, SessionRequestError>[] = [];
  const clock = yield* Clock.Clock;
  const edits = yield* Queue.sliding<void>(1);
  const syncRequests = yield* Queue.sliding<void>(1);
  const urgent = yield* Latch.make(false);
  const permit = yield* Semaphore.make(1);

  /**
   * Whether a newer remote snapshot may be applied now. Not while a PATCH is unacknowledged:
   * it may already have committed under a later edit from elsewhere, and rebasing it as local
   * work would write it again over that edit. Newer revisions wait in `targetRevision` until
   * the write settles.
   */
  const canSyncRemote = () =>
    state.phase.tag !== "ended" &&
    state.phase.tag !== "conflict" &&
    state.phase.tag !== "writing" &&
    state.phase.tag !== "retrying" &&
    state.local.tag === "valid";

  /** Fetch the latest session when a newer revision is known and it may be applied. */
  function syncIfBehind() {
    if (canSyncRemote() && state.targetRevision > state.revision) {
      Queue.offerUnsafe(syncRequests, undefined);
    }
  }

  function report() {
    const { status, failure } = statusOf(state.phase);
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
    if (state.phase.tag === "ended") return;
    state.phase = { tag: "ended", failure };
    settle(failure);
    report();
  }

  /** Record the stores' current synced state; schedule a write when it changed. */
  function changed() {
    if (state.phase.tag === "ended" || state.applyingRemote) return;
    const next = readLocal();
    if (sameLocal(next, state.local)) return;
    state.local = next;
    state.phase = transitionLocalChange(
      state.phase,
      next,
      state.savedKey,
      clock.currentTimeMillisUnsafe(),
    );

    if (state.phase.tag === "saved") settle();
    report();
    if (state.phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
    syncIfBehind();
  }

  /**
   * Reconcile an incoming authoritative `SavedSession` (from a merged PATCH reply
   * or an SSE-triggered fetch) with local edits it does not cover, so local work
   * is preserved. `baseForPending` is what the server already has of this tab's
   * edits: the acknowledged state, or for a PATCH reply, the document it sent.
   */
  function reconcileRemote(
    remote: SavedSession,
    baseForPending: SessionDocument,
    { fromWrite }: { fromWrite: boolean },
  ) {
    if (state.phase.tag === "ended" || state.phase.tag === "conflict") return;

    const liveLocal = readLocal();
    if (liveLocal.tag === "unserializable") {
      // Do not overwrite unsaveable local work; defer reconciliation until local stores serialize.
      state.local = liveLocal;
      if (remote.revision > state.targetRevision) state.targetRevision = remote.revision;
      state.phase = { tag: "refused", bodyKey: undefined, failure: unsaveable };
      settle(unsaveable);
      report();
      return;
    }

    if (remote.revision < state.revision) {
      if (fromWrite && state.phase.tag === "writing") {
        state.phase = phaseFromLocal(state.local, state.savedKey, state.phase.editedAt);
      }
      if (state.phase.tag === "saved") settle();
      else if (state.phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
      report();
      return;
    }

    const pendingLocal = diffSessionPatch(baseForPending, liveLocal.doc);

    state.revision = remote.revision;
    if (state.targetRevision < state.revision) state.targetRevision = state.revision;
    state.syncedInput = { name: remote.name, snapshot: remote.snapshot };
    state.savedKey = syncKey(state.syncedInput);

    const target = pendingLocal
      ? applySessionPatch(state.syncedInput, pendingLocal)
      : state.syncedInput;
    let reconciledKey: string;
    state.applyingRemote = true;
    try {
      applyRemoteSnapshot(stores, target.snapshot);
      if (target.name !== options.name()) onRemoteRename?.(target.name);
      const reconciled = currentDoc();
      reconciledKey = syncKey(reconciled);
      state.local = { tag: "valid", doc: reconciled, key: reconciledKey };
      if (!pendingLocal) {
        state.syncedInput = reconciled;
        state.savedKey = reconciledKey;
      }
    } finally {
      state.applyingRemote = false;
    }

    state.phase = transitionAfterReconcile(state.phase, {
      hasPendingLocal: Boolean(pendingLocal),
      reconciledKey,
      savedKey: state.savedKey,
      now: clock.currentTimeMillisUnsafe(),
    });

    const { snapshot: _snapshot, ...metadata } = remote;
    onSaved(metadata);
    if (state.phase.tag === "saved") settle();
    else if (state.phase.tag === "dirty") Queue.offerUnsafe(edits, undefined);
    report();
    syncIfBehind();
  }

  /**
   * Load the latest session from the server for both SSE hint catch-up and
   * reconnect revalidation, handling terminal errors identically in both paths.
   */
  const loadRemote = Effect.gen(function* () {
    const loaded = yield* Effect.result(transport.load(id));
    if (state.phase.tag === "ended") return { tag: "ended" } as const;
    if (Result.isFailure(loaded)) {
      if (isTerminalLoadError(loaded.failure)) {
        endWith(loaded.failure);
        return { tag: "ended" } as const;
      }
      return loaded.failure.code === "UNAVAILABLE"
        ? ({ tag: "retry" } as const)
        : ({ tag: "stop" } as const);
    }
    const remote = loaded.success;
    if (remote.revision > state.revision) {
      if (canSyncRemote()) {
        // No PATCH is outstanding, so every edit since the acknowledged state is local work.
        reconcileRemote(remote, state.syncedInput, { fromWrite: false });
      } else if (remote.revision > state.targetRevision) {
        state.targetRevision = remote.revision;
      }
    }
    return { tag: "loaded", revision: remote.revision } as const;
  });

  const write = Effect.gen(function* () {
    if (
      state.phase.tag === "ended" ||
      state.phase.tag === "conflict" ||
      state.phase.tag === "refused"
    ) {
      return settle(state.phase.failure);
    }
    if (state.phase.tag === "saved" || state.phase.tag === "writing") return settle();

    let pending: PendingPatch;
    let failures: number;
    let editedAt: number;

    if (state.phase.tag === "retrying") {
      pending = state.phase.pending;
      failures = state.phase.failures;
      editedAt = state.phase.editedAt;
    } else {
      if (state.local.tag !== "valid") {
        state.phase = { tag: "refused", bodyKey: undefined, failure: unsaveable };
        settle(unsaveable);
        return report();
      }
      if (state.local.key === state.savedKey) {
        state.phase = { tag: "saved" };
        settle();
        return report();
      }
      const patch = diffSessionPatch(state.syncedInput, state.local.doc);
      if (!patch) {
        state.savedKey = state.local.key;
        state.phase = { tag: "saved" };
        settle();
        return report();
      }
      pending = {
        bodyKey: state.local.key,
        input: state.local.doc,
        patch,
        saveId: crypto.randomUUID(),
      };
      failures = 0;
      editedAt = state.phase.editedAt;
    }

    state.phase = { tag: "writing", pending, failures, editedAt };
    report();

    const result = yield* Effect.result(
      transport.patch(id, { clientId, saveId: pending.saveId, patch: pending.patch }),
    );
    if (state.phase.tag !== "writing" || state.phase.pending !== pending) return;

    if (Result.isSuccess(result)) {
      reconcileRemote(result.success, pending.input, { fromWrite: true });
      return;
    }

    const failure = result.failure;
    state.phase = transitionWriteFailure(
      state.phase,
      failure,
      state.local,
      state.savedKey,
      clock.currentTimeMillisUnsafe(),
    );
    if (state.phase.tag === "retrying" || state.phase.tag === "dirty") {
      Queue.offerUnsafe(edits, undefined);
    }
    settle(failure);
    report();
    syncIfBehind();
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
  if (typeof EventSource !== "undefined") {
    let streamFailures = 0;
    const syncLoop = Effect.gen(function* () {
      while (state.phase.tag !== "ended") {
        yield* Queue.take(syncRequests);
        while (canSyncRemote() && state.targetRevision > state.revision) {
          const outcome = yield* loadRemote;
          if (outcome.tag === "stop" || outcome.tag === "ended") break;
          if (outcome.tag === "retry") {
            yield* Effect.sleep(1000);
            continue;
          }
          if (outcome.revision >= state.targetRevision) break;
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
              Effect.sync(() => new EventSource(transport.eventsUrl(id, state.revision))),
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
              if (!active || state.phase.tag === "ended") return;
              streamFailures = 0;
              const parsed = sessionEventSchema.safeParse(parseJson(message.data));
              if (!parsed.success || parsed.data.type !== "updated") return;
              const { revision: incomingRevision, sourceClientId } = parsed.data;
              if (sourceClientId === clientId || incomingRevision <= state.revision) return;
              if (incomingRevision > state.targetRevision) {
                state.targetRevision = incomingRevision;
                if (canSyncRemote()) Queue.offerUnsafe(syncRequests, undefined);
              }
            });
            source.addEventListener("deleted", (message: MessageEvent<string>) => {
              if (!active || state.phase.tag === "ended") return;
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
        if (state.phase.tag === "ended") return yield* Effect.never;
        if (streamErrored) {
          // EventSource hides HTTP status codes (e.g. 404 after deletion while offline,
          // or 401 after sign-out). Revalidate so terminal failures stop reconnecting.
          const outcome = yield* loadRemote;
          if (outcome.tag === "ended") return yield* Effect.never;
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
      while (state.phase.tag !== "ended") {
        yield* Queue.take(edits);
        // A later edit restarts the quiet period, but never changes the retry deadline.
        let changedDuringDelay: boolean;
        do {
          const due =
            state.phase.tag === "retrying"
              ? state.phase.retryAt
              : state.phase.tag === "dirty"
                ? state.phase.editedAt + editDelay
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

  const flush = Effect.suspend(() => {
    changed();
    const blocked = blockedError(state.phase);
    if (blocked) return Effect.fail(blocked);
    if (state.phase.tag === "saved") return Effect.void;
    const waiter = Deferred.makeUnsafe<void, SessionRequestError>();
    waiters.push(waiter);
    urgent.openUnsafe();
    Queue.offerUnsafe(edits, undefined);
    return Deferred.await(waiter);
  });

  return {
    /** Save the session's new name with its next write. */
    renamed: changed,
    /**
     * Whether any synced edit is not yet acknowledged, including the patch being
     * written and edits that cannot be saved.
     */
    dirty() {
      changed();
      return state.phase.tag !== "saved";
    },
    /**
     * Write every synced edit made so far without waiting for the edit delay.
     * Fails if a write fails, and at once when the latest edits cannot be saved.
     */
    flush,
    /**
     * Write every synced edit made so far without waiting for the edit delay, then
     * wait until the server has them, through transient failures and their retries.
     * Fails only once the edits cannot be saved. Waits as long as the server is
     * unreachable, so callers bound it.
     */
    saved: Effect.gen(function* () {
      if (Result.isSuccess(yield* Effect.result(flush))) return;
      // A transient failure retries with backoff on its own, so wait for those writes.
      for (;;) {
        changed();
        const blocked = blockedError(state.phase);
        if (blocked) return yield* Effect.fail(blocked);
        if (state.phase.tag === "saved") return;
        const settled = Deferred.makeUnsafe<void, SessionRequestError>();
        waiters.push(settled);
        yield* Effect.result(Deferred.await(settled));
      }
    }),
    /** Wait for a write in progress, then hold further writes until `resume`. */
    pause: Effect.asVoid(permit.take(1)),
    resume: Effect.gen(function* () {
      yield* permit.release(1);
      changed();
      if (state.phase.tag === "dirty" || state.phase.tag === "retrying") {
        Queue.offerUnsafe(edits, undefined);
      }
    }),
    overwrite: Effect.gen(function* () {
      const resolving = state.phase;
      if (resolving.tag !== "conflict") return;
      const loaded = yield* Effect.result(transport.load(id));
      if (state.phase !== resolving) return;
      if (Result.isFailure(loaded)) {
        if (loaded.failure.code !== "UNAVAILABLE") {
          state.phase = { tag: "ended", failure: loaded.failure };
          report();
        }
        return yield* Effect.fail(loaded.failure);
      }
      state.revision = loaded.success.revision;
      state.targetRevision = Math.max(state.targetRevision, state.revision);
      state.syncedInput = { name: loaded.success.name, snapshot: loaded.success.snapshot };
      state.savedKey = syncKey(state.syncedInput);
      state.local = readLocal();
      state.phase = phaseFromLocal(state.local, state.savedKey, clock.currentTimeMillisUnsafe());
      report();
      if (state.phase.tag === "dirty") {
        urgent.openUnsafe();
        Queue.offerUnsafe(edits, undefined);
      } else if (state.phase.tag === "saved") {
        settle();
      }
      if (state.targetRevision > state.revision) Queue.offerUnsafe(syncRequests, undefined);
    }),
  };
});

export type Autosave = Effect.Success<ReturnType<typeof startAutosave>>;
