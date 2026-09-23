import type { BrowserStoreInstance, TrackStoreInstance } from "@weng-lab/genomebrowser";
import { captureSessionSnapshot } from "./snapshot";
import type { SavedSession, SaveSessionInput, SaveSessionResult, SessionSnapshot } from "./types";

type Status = { phase: "saved" | "pending" | "saving" } | { phase: "error"; message: string };
type Options = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  initialSession: Pick<SavedSession, "id" | "name" | "revision">;
  initialSnapshot: SessionSnapshot;
  save: (input: SaveSessionInput) => Promise<SaveSessionResult>;
};

// JSONB and validation may reorder object keys; array order remains meaningful.
function snapshotKey(snapshot: SessionSnapshot) {
  return JSON.stringify(snapshot, (_key, value) =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
        )
      : value,
  );
}

/** One writer per open session. Store notifications only queue work; serialization runs later. */
export function createSessionAutosave({
  browserStore,
  trackStore,
  initialSession,
  initialSnapshot,
  save,
}: Options) {
  let revision = initialSession.revision;
  let savedSnapshot = snapshotKey(initialSnapshot);
  let status: Status = { phase: "saved" };
  let dirty = false;
  let inFlight = false;
  let connected = false;
  let blocked = false;
  let retryDelay = 1_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  function publish(next: Status) {
    if (status.phase === next.phase && next.phase !== "error") return;
    status = next;
    for (const listener of listeners) listener();
  }

  function schedule(delay = 350) {
    if (timer !== undefined || inFlight || blocked || !connected) return;
    // A fixed batching window also makes progress during continuous editing.
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delay);
  }

  function changed() {
    dirty = true;
    if (blocked) return;
    if (!inFlight) publish({ phase: "pending" });
    schedule();
  }

  async function flush() {
    clearTimeout(timer);
    timer = undefined;
    if (inFlight || !dirty || blocked) return;
    let snapshot: SessionSnapshot;
    let serialized: string;
    try {
      snapshot = captureSessionSnapshot(browserStore, trackStore);
      serialized = snapshotKey(snapshot);
    } catch {
      publish({
        phase: "error",
        message: "These settings could not be saved. Check the track configuration.",
      });
      return;
    }
    dirty = false;
    // Selection mode and other runtime-only changes must not cause writes.
    if (serialized === savedSnapshot) {
      publish({ phase: "saved" });
      return;
    }
    inFlight = true;
    publish({ phase: "saving" });
    let result: SaveSessionResult;
    try {
      result = await save({ id: initialSession.id, name: initialSession.name, revision, snapshot });
    } catch {
      result = {
        ok: false,
        error: "Changes are not saved yet. Retrying when storage is available.",
        retryable: true,
      };
    }
    inFlight = false;
    if (!result.ok) {
      dirty = true;
      blocked = !result.retryable;
      publish({ phase: "error", message: result.error });
      schedule(retryDelay);
      retryDelay = Math.min(retryDelay * 2, 10_000);
      return;
    }
    revision = result.revision;
    savedSnapshot = serialized;
    retryDelay = 1_000;
    if (dirty) {
      publish({ phase: "pending" });
      if (connected) schedule();
      else void flush(); // Drain edits made during the last request when navigating away.
    } else {
      publish({ phase: "saved" });
    }
  }

  return {
    getStatus: () => status,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect() {
      connected = true;
      const unsubscribeBrowser = browserStore.subscribe(changed);
      const unsubscribeTracks = trackStore.subscribe(changed);
      // Catch changes made by child mount effects before subscriptions were attached.
      changed();
      return () => {
        connected = false;
        unsubscribeBrowser();
        unsubscribeTracks();
        void flush();
      };
    },
    flush,
  };
}

export async function persistSession(input: SaveSessionInput): Promise<SaveSessionResult> {
  const body = JSON.stringify(input);
  const response = await fetch(`/api/sessions/${encodeURIComponent(input.id!)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
    // Browsers limit outstanding keepalive bodies to 64 KiB.
    keepalive: new Blob([body]).size < 60_000,
  });
  if (response.status >= 500) throw new Error("Session storage is unavailable.");
  return response.json();
}
