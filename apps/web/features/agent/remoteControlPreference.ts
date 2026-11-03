import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountSettingsError, requestAccountSettings } from "../account/settings";

/**
 * Where the preference stands. Only `saved` with `enabled` allows attaching:
 * a read that fails, an unverified account, and a change still being saved
 * all keep the tab detached.
 */
type State =
  | { status: "loading" }
  | { status: "saved"; enabled: boolean; error?: string }
  | { status: "saving"; enabled: boolean; previous: boolean }
  | { status: "unavailable"; error: string }
  | { status: "signed-out" };

type Event =
  | { type: "save"; enabled: boolean }
  | { type: "loaded"; enabled: boolean }
  | { type: "failed"; unauthenticated: boolean };

function transition(state: State, event: Event): State {
  switch (event.type) {
    case "save":
      return state.status === "saved"
        ? { status: "saving", enabled: event.enabled, previous: state.enabled }
        : state;
    case "loaded":
      return { status: "saved", enabled: event.enabled };
    case "failed":
      if (event.unauthenticated) return { status: "signed-out" };
      // A failed save keeps the choice that was already saved.
      if (state.status === "saving")
        return {
          status: "saved",
          enabled: state.previous,
          error: "Remote control could not be saved. Try again.",
        };
      return { status: "unavailable", error: "Remote control settings could not be loaded." };
  }
}

export type RemoteControlPreference = {
  status: State["status"];
  /** The switch position: the saved choice, or the one being saved. */
  enabled: boolean;
  /** Whether this tab may attach. */
  allowed: boolean;
  /** Why the last read or save failed. */
  error: string | undefined;
  setEnabled: (enabled: boolean) => void;
  /** Read the preference again, as after it could not be loaded. */
  reload: () => void;
};

/**
 * The account's saved Remote Control preference. It is read when mounted and
 * whenever the window regains focus, and changes are saved one at a time.
 * Turning remote control off detaches at once and returns to the saved choice
 * if the save fails; turning it on attaches once saved. Mount it once per
 * account: requests belong to the account signed in when they start.
 */
export function useRemoteControlPreference(): RemoteControlPreference {
  const [state, setState] = useState<State>({ status: "loading" });
  // One request at a time. A read never interrupts a save; a save replaces a read.
  const request = useRef<{ controller: AbortController; save: boolean }>(undefined);

  const send = useCallback((save?: boolean) => {
    if (request.current?.save) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, save: save !== undefined };
    if (save !== undefined) setState((state) => transition(state, { type: "save", enabled: save }));
    // A replaced or unmounted request changes nothing.
    const settle = (event: Event) => {
      if (controller.signal.aborted) return;
      request.current = undefined;
      setState((state) => transition(state, event));
    };
    requestAccountSettings(
      controller.signal,
      save === undefined ? undefined : { remoteControl: save },
    ).then(
      (settings) => settle({ type: "loaded", enabled: settings.remoteControl }),
      (failure: unknown) =>
        settle({
          type: "failed",
          unauthenticated:
            failure instanceof AccountSettingsError && failure.code === "UNAUTHENTICATED",
        }),
    );
  }, []);

  useEffect(() => {
    const read = () => send();
    read();
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("focus", read);
      request.current?.controller.abort();
      request.current = undefined;
    };
  }, [send]);

  const setEnabled = useCallback((enabled: boolean) => send(enabled), [send]);
  const reload = useCallback(() => send(), [send]);
  return useMemo(
    () => ({
      status: state.status,
      enabled: "enabled" in state && state.enabled,
      allowed: state.status === "saved" && state.enabled,
      error: "error" in state ? state.error : undefined,
      setEnabled,
      reload,
    }),
    [state, setEnabled, reload],
  );
}
