import { createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import {
  sessionSnapshotSchema,
  type SessionSnapshot,
  type ConnectedEvent,
} from "@weng-lab/browser-server/protocol";
import type { BrowserSession } from "./BrowserSession";

export type SessionSaveState = "loading" | "load-error" | "saving" | "saved" | "error" | "disabled";

function snapshot(session: BrowserSession): SessionSnapshot {
  const browser = session.useBrowserStore.getState();
  const tracks = session.useTrackStore.getState();
  const values = {
    version: 1,
    browser: {
      assembly: browser.assembly.id,
      region: browser.region,
      basePairDetail: browser.basePairDetail,
      marginWidth: browser.marginWidth,
      trackWidth: browser.trackWidth,
      fontSize: browser.fontSize,
      titleSize: browser.titleSize,
      highlights: browser.highlights,
      selectionMode: browser.selectionMode,
      selectionHighlight: browser.selectionHighlight,
    },
    tracks: tracks.tracks.map(({ type, base, config, source }) => ({ type, base, config, source })),
    pinnedTrackIds: tracks.pinnedTrackIds,
  };
  // Optional settings can be explicitly cleared to undefined. JSON omits those
  // keys, matching the payload sent to storage and the module defaults on restore.
  return sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(values)));
}

function restore(session: BrowserSession, saved: SessionSnapshot) {
  // Validate both stores before changing either live store. Runtime actions and
  // registered modules stay local; only serializable session values are restored.
  const browser = createBrowserStore({
    ...saved.browser,
    assembly: session.useBrowserStore.getState().assembly,
  }).getState();
  const tracks = createTrackStore({
    modules: session.useTrackStore.getState().registry.modules,
    tracks: saved.tracks,
    pinnedTrackIds: saved.pinnedTrackIds,
  }).getState();
  const { assembly: _assembly, ...values } = saved.browser;
  session.useBrowserStore.setState({ ...values, region: browser.region });
  session.useTrackStore.setState({
    tracks: tracks.tracks,
    order: tracks.order,
    pinnedTrackIds: tracks.pinnedTrackIds,
  });
}

/** Restore once, then serialize writes so an older request cannot overwrite a newer edit. */
export function persistBrowserSession(
  endpoint: string,
  session: BrowserSession,
  onState: (state: SessionSaveState) => void,
) {
  let connection: ConnectedEvent | undefined;
  let initialized = false;
  let stopped = false;
  let writing = false;
  let latest = "";
  let saved = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();
  const unsubscribe: (() => void)[] = [];

  function schedule(delay = 200) {
    clearTimeout(timer);
    if (!stopped && connection && latest !== saved) timer = setTimeout(() => void write(), delay);
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
    if (stopped || writing || !connection || latest === saved) return;
    writing = true;
    const body = latest;
    const current = connection;
    onState("saving");
    try {
      const response = await fetch(`${endpoint}/clients/${current.clientId}/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  return {
    connected(next: ConnectedEvent) {
      connection = next;
      if (!initialized) {
        if (next.snapshot) restore(session, next.snapshot);
        latest = JSON.stringify(snapshot(session));
        saved = next.snapshot ? latest : "";
        initialized = true;
        unsubscribe.push(
          session.useBrowserStore.subscribe(changed),
          session.useTrackStore.subscribe(changed),
        );
      }
      onState(latest === saved ? "saved" : "saving");
      schedule();
    },
    disconnected() {
      connection = undefined;
      clearTimeout(timer);
    },
    dispose() {
      stopped = true;
      clearTimeout(timer);
      abort.abort();
      unsubscribe.forEach((stop) => stop());
    },
  };
}
