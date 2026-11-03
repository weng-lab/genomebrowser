"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { accountSettingsSchema, type AccountSettings } from "./settings";

type Settings = {
  settings: AccountSettings | undefined;
  pending: boolean;
  error: string | undefined;
  setRemoteControl: (enabled: boolean) => void;
};
const SettingsContext = createContext<Settings | null>(null);

/** The current account's persisted preferences, refreshed on focus and changes in other tabs. */
export function AccountSettingsProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<AccountSettings>();
  const [pending, setPending] = useState(userId !== null);
  const [error, setError] = useState<string>();
  const request = useRef<AbortController | undefined>(undefined);
  const writing = useRef(false);
  const notification = `gb:account-settings:${userId}`;

  const load = useCallback(
    async (next?: AccountSettings) => {
      // Focus or another tab's notification must not interrupt a preference write.
      if (!next && writing.current) return;
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      writing.current = next !== undefined;
      setPending(true);
      setError(undefined);
      try {
        const response = await fetch("/api/account/settings", {
          method: next ? "PUT" : "GET",
          headers: next ? { "Content-Type": "application/json" } : undefined,
          body: next ? JSON.stringify(next) : undefined,
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load or save account settings. Try again.");
        const saved = accountSettingsSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        setSettings(saved);
        if (next) {
          // Storage is only a notification. The preference itself lives on the server.
          try {
            localStorage.setItem(notification, crypto.randomUUID());
          } catch {
            /* Storage may be unavailable. */
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Account settings are unavailable");
      } finally {
        if (!controller.signal.aborted) {
          writing.current = false;
          // react-doctor-disable-next-line react-doctor/no-loading-flag-reset-outside-finally -- Already in finally; an aborted request must not clear a newer request's pending state.
          setPending(false);
        }
      }
    },
    [notification],
  );

  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      // oxlint-disable-next-line typescript/no-floating-promises -- load handles request failures; the provider owns cancellation.
      void load();
    };
    const changed = (event: StorageEvent) => {
      if (event.key === notification) refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", changed);
    return () => {
      request.current?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", changed);
    };
  }, [userId, notification, load]);

  const setRemoteControl = useCallback(
    (enabled: boolean) => {
      // oxlint-disable-next-line typescript/no-floating-promises -- load reports save failures in state and owns cancellation.
      if (userId) void load({ remoteControlEnabled: enabled });
    },
    [userId, load],
  );

  const value = useMemo(
    () => ({ settings, pending, error, setRemoteControl }),
    [settings, pending, error, setRemoteControl],
  );
  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useAccountSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("AccountSettingsProvider is required");
  return value;
}
