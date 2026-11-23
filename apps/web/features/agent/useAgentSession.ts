"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SessionStore } from "eve/client";
import { activeTurn } from "eve/events";

/**
 * One ephemeral Eve conversation bound to `sessionId`. Cancels active work when
 * the browser session aborts or the component unmounts, keeping observation
 * open until cancellation settles so pending submissions are not stranded.
 */
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
      if (stopping) {
        stopping.then(release, release).catch(() => {});
      } else {
        release();
      }
    };
  }, [store, signal]);

  return { ...snapshot, store };
}
