"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SessionStore } from "eve/client";
import { activeTurn } from "eve/events";

/** One conversation per keyed chat; teardown retains observation until cancellation is accepted. */
export function useAgentSession(sessionId: string, signal: AbortSignal) {
  const [store] = useState(
    () => new SessionStore({ headers: { "x-genomebrowser-session-id": sessionId } }),
  );
  const subscribe = useCallback((notify: () => void) => store.subscribe(notify), [store]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => store.snapshot,
    () => store.snapshot,
  );

  useEffect(() => {
    const release = store.observe();
    let stopping: Promise<unknown> | undefined;
    const stop = () => {
      if (store.snapshot.status === "idle" && !activeTurn(store.snapshot.view)) return;
      stopping ??= store.cancel().catch((error: unknown) => {
        console.error("Could not cancel the browser agent session.", error);
      });
    };
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
    return () => {
      signal.removeEventListener("abort", stop);
      stop();
      // cancel() may await a pending send's acceptance and turn.started event.
      // Detaching first aborts that wait and leaves server work running.
      if (stopping) void stopping.then(release, release);
      else release();
    };
  }, [store, signal]);

  return { ...snapshot, store };
}
