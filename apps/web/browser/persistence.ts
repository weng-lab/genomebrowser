import { sessionSnapshotSchema } from "@weng-lab/session-snapshot";
import type { BrowserSession } from "./BrowserSession";
import { restore, snapshot } from "./snapshot";

export type SessionSaveState = "loading" | "load-error" | "saving" | "saved" | "error" | "disabled";

/** Load the saved session once, then serialize writes so an older request cannot overwrite a newer edit. */
export function persistBrowserSession(
  sessionUrl: string,
  session: BrowserSession,
  onState: (state: SessionSaveState) => void,
) {
  let stopped = false;
  let writing = false;
  let writeFailed = false;
  let deleting = false;
  let initialized = false;
  let loading = false;
  let pendingWrite: Promise<void> | undefined;
  let latest = "";
  let saved = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const unsubscribe: (() => void)[] = [];

  function schedule(delay = 200) {
    clearTimeout(timer);
    if (!stopped && !deleting && latest !== saved)
      timer = setTimeout(() => {
        if (!writing) pendingWrite = write();
      }, delay);
  }

  function changed() {
    if (stopped || deleting) return;
    try {
      const next = JSON.stringify(snapshot(session));
      if (next === latest) return;
      latest = next;
      onState("saving");
      schedule();
    } catch {
      onState("error");
    }
  }

  async function write() {
    if (stopped || deleting || writing || latest === saved) return;
    writing = true;
    writeFailed = false;
    const body = latest;
    onState("saving");
    try {
      const response = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("Session save failed");
      saved = body;
      if (!stopped && !deleting) onState(latest === saved ? "saved" : "saving");
    } catch {
      writeFailed = true;
      if (!stopped && !deleting) onState("error");
    } finally {
      writing = false;
      if (!stopped && !deleting) schedule(latest === body ? 2000 : 0);
    }
  }

  async function load() {
    // Deletion recovery reuses an outstanding read instead of restoring twice.
    if (stopped || deleting || initialized || loading) return;
    loading = true;
    onState("loading");
    try {
      const response = await fetch(sessionUrl, { signal: abort.signal });
      if (!response.ok && response.status !== 404) throw new Error("Session load failed");
      const restored =
        response.status === 404 ? null : sessionSnapshotSchema.parse(await response.json());
      if (stopped || deleting) return;
      if (restored) restore(session, restored);
      latest = JSON.stringify(snapshot(session));
      saved = restored ? latest : "";
      unsubscribe.push(
        session.useBrowserStore.subscribe(changed),
        session.useTrackStore.subscribe(changed),
      );
      initialized = true;
      onState(latest === saved ? "saved" : "saving");
      schedule();
    } catch {
      if (stopped || deleting) return;
      onState("load-error");
      timer = setTimeout(() => void load(), 2000);
    } finally {
      loading = false;
    }
  }

  async function flush() {
    if (stopped || deleting) throw new Error("Session is not ready to save");
    // Before restoration succeeds, these stores are defaults, not unsaved user edits.
    // Leave the original snapshot untouched and allow selection of a working session.
    if (!initialized) return;
    clearTimeout(timer);
    if (writing) {
      await pendingWrite;
      if (writeFailed) throw new Error("Session save failed");
    }
    // Capture edits made while an earlier write was outstanding, too.
    while (!stopped && !deleting) {
      latest = JSON.stringify(snapshot(session));
      clearTimeout(timer);
      if (latest === saved) return;
      const body = latest;
      pendingWrite = write();
      await pendingWrite;
      if (saved !== body) throw new Error("Session save failed");
    }
    throw new Error("Session closed before saving");
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    abort.abort();
    unsubscribe.forEach((unsubscribe) => unsubscribe());
  }

  async function remove() {
    deleting = true;
    clearTimeout(timer);
    try {
      // Let a save already accepted by the server finish before deleting its snapshot.
      await pendingWrite;
      if (stopped) throw new Error("Session closed before deletion");
      const response = await fetch(sessionUrl, { method: "DELETE", signal: abort.signal });
      if (!response.ok) throw new Error("Session deletion failed");
      stop();
    } catch (error) {
      deleting = false;
      if (!stopped) {
        if (initialized) {
          changed();
          onState(latest === saved ? "saved" : "saving");
          schedule();
        } else {
          void load();
        }
      }
      throw error;
    }
  }

  void load();
  return { stop, remove, flush };
}
