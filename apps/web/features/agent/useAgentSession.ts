"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SessionStore, type SessionSnapshot } from "eve/client";
import { activeTurn } from "eve/events";

/** How long an unmounted panel keeps its stream open for Stop to reach a turn that is starting. */
const stopWaitMs = 10_000;

/**
 * The Eve conversation of `sessionId`'s agent thread: `saved` continues it from
 * what Eve already held, and null starts the thread with the next message.
 * Cancels active work when the browser session aborts or the component
 * unmounts, keeping observation open until cancellation settles, within a
 * bound, so pending submissions are not stranded.
 */
export function useAgentSession(
  sessionId: string,
  saved: SessionSnapshot | null,
  signal: AbortSignal,
) {
  const [store] = useState(
    () =>
      new SessionStore({
        headers: { "x-genomebrowser-session-id": sessionId },
        ...(saved && { initialEvents: saved.events, initialSession: saved.session }),
      }),
  );
  // A saved conversation reads as resuming from the first render, before its catch-up starts.
  const [resumed, setResumed] = useState(!saved);
  const caughtUp = useCallback(() => setResumed(true), []);
  const subscribe = useCallback((notify: () => void) => store.subscribe(notify), [store]);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => store.snapshot,
    () => store.snapshot,
  );

  useEffect(() => {
    const release = store.observe();
    // Follow the saved conversation from where its snapshot ended; failures surface
    // through the store's `error`.
    if (saved) store.resume().then(caughtUp, caughtUp);
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
      // Detaching first aborts that wait and leaves server work running, so keep
      // observing until it settles, but no longer than the bound.
      if (!stopping) return release();
      const bound = setTimeout(release, stopWaitMs);
      stopping
        .finally(() => {
          clearTimeout(bound);
          release();
        })
        .catch(() => {});
    };
  }, [store, saved, signal, caughtUp]);

  return { ...snapshot, status: resumed ? snapshot.status : ("resuming" as const), store };
}
