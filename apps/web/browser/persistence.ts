import { sessionSnapshotSchema } from "@weng-lab/browser-server/protocol";
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
  let latest = "";
  let saved = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const unsubscribe: (() => void)[] = [];

  function schedule(delay = 200) {
    clearTimeout(timer);
    if (!stopped && latest !== saved) timer = setTimeout(() => void write(), delay);
  }

  function changed() {
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
    if (stopped || writing || latest === saved) return;
    writing = true;
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
      if (!stopped) onState(latest === saved ? "saved" : "saving");
    } catch {
      if (!stopped) onState("error");
    } finally {
      writing = false;
      if (!stopped) schedule(latest === body ? 2000 : 0);
    }
  }

  async function load() {
    onState("loading");
    try {
      const response = await fetch(sessionUrl, { signal: abort.signal });
      if (!response.ok && response.status !== 404) throw new Error("Session load failed");
      const restored =
        response.status === 404 ? null : sessionSnapshotSchema.parse(await response.json());
      if (stopped) return;
      if (restored) restore(session, restored);
      latest = JSON.stringify(snapshot(session));
      saved = restored ? latest : "";
      unsubscribe.push(
        session.useBrowserStore.subscribe(changed),
        session.useTrackStore.subscribe(changed),
      );
      onState(latest === saved ? "saved" : "saving");
      schedule();
    } catch {
      if (stopped) return;
      onState("load-error");
      timer = setTimeout(() => void load(), 2000);
    }
  }

  void load();
  return () => {
    stopped = true;
    clearTimeout(timer);
    abort.abort();
    unsubscribe.forEach((stop) => stop());
  };
}
