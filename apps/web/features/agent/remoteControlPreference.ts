import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountSettingsError, requestAccountSettings } from "../account/settings";

/**
 * The account's saved Remote Control preference. `loading` until first read,
 * `saving` while a change is sent, `signed-out` without an account, and
 * `unavailable` when it could not be read; `reload` then tries again.
 */
export type RemoteControlPreference = {
  status: "loading" | "saved" | "saving" | "signed-out" | "unavailable";
  /** The switch position: the saved choice, or the one being saved. */
  enabled: boolean;
  /** Whether this tab may attach. Turning it off stops attachment before the save completes. */
  allowed: boolean;
  /** Why the last read or save failed, until the next one starts. */
  error: string | undefined;
  setEnabled: (enabled: boolean) => void;
  reload: () => void;
};

/**
 * Reads the preference when mounted and whenever the window regains focus, and
 * saves changes one at a time. Turning remote control off applies at once and
 * returns to the saved choice if the save fails; turning it on applies once
 * saved. Mount it once per account: requests belong to the account signed in
 * when they start.
 */
export function useRemoteControlPreference(): RemoteControlPreference {
  const [saved, setSaved] = useState<boolean>();
  const [saving, setSaving] = useState<boolean>();
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string>();
  // One request at a time. A read never interrupts a save; a save replaces a read.
  const request = useRef<{ controller: AbortController; save?: boolean }>(undefined);

  const send = useCallback((save?: boolean) => {
    if (request.current?.save !== undefined) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    request.current = { controller, save };
    setSaving(save);
    setError(undefined);
    // A replaced or unmounted request changes nothing.
    function settle(result: { saved: boolean } | { failure: unknown }) {
      if (controller.signal.aborted) return;
      request.current = undefined;
      setSaving(undefined);
      if ("saved" in result) setSaved(result.saved);
      else if (
        result.failure instanceof AccountSettingsError &&
        result.failure.code === "UNAUTHENTICATED"
      )
        setSignedOut(true);
      else if (save === undefined) setError("Remote control settings could not be loaded.");
      else setError("Remote control could not be saved. Try again.");
    }
    requestAccountSettings(
      controller.signal,
      save === undefined ? undefined : { remoteControl: save },
    ).then(
      (settings) => settle({ saved: settings.remoteControl }),
      (failure: unknown) => settle({ failure }),
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

  let status: RemoteControlPreference["status"] = "saved";
  if (signedOut) status = "signed-out";
  else if (saving !== undefined) status = "saving";
  else if (saved === undefined) status = error ? "unavailable" : "loading";
  const enabled = saving ?? saved ?? false;
  const allowed = saved === true && saving !== false;
  return useMemo(
    () => ({ status, enabled, allowed, error, setEnabled, reload }),
    [status, enabled, allowed, error, setEnabled, reload],
  );
}
