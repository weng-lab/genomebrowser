"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { useBrowserSession } from "./BrowserSession";
import { persistBrowserSession, type SessionSaveState } from "./persistence";
import { connectRemoteControl, type RemoteControlState } from "./remoteControl";

const disabledSaveStore = createStore<{ status: SessionSaveState }>(() => ({ status: "disabled" }));
const SessionSaveContext = createContext(disabledSaveStore);
const SessionIdContext = createContext<string | null>(null);

type RemoteControl = {
  state: RemoteControlState;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};
const RemoteControlContext = createContext<RemoteControl>({
  state: "off",
  enabled: false,
  setEnabled: () => {},
});

/** Save one session to the server and, while enabled, accept remote commands for it. */
export function BrowserServer({
  endpoint,
  sessionId,
  children,
}: {
  endpoint?: string;
  sessionId: string;
  children: ReactNode;
}) {
  const session = useBrowserSession();
  const [saveStore] = useState(() =>
    createStore<{ status: SessionSaveState }>(() => ({ status: "loading" })),
  );
  const [enabled, setEnabled] = useState(true);
  const [state, setState] = useState<RemoteControlState>("off");
  const sessionUrl = endpoint && `${endpoint.replace(/\/$/, "")}/sessions/${sessionId}`;

  useEffect(() => {
    if (sessionUrl)
      return persistBrowserSession(sessionUrl, session, (status) => saveStore.setState({ status }));
  }, [sessionUrl, session, saveStore]);

  useEffect(() => {
    if (sessionUrl && enabled) return connectRemoteControl(`${sessionUrl}/rpc`, session, setState);
  }, [sessionUrl, enabled, session]);

  return (
    <SessionIdContext value={sessionId}>
      <RemoteControlContext value={{ state, enabled, setEnabled }}>
        <SessionSaveContext value={sessionUrl ? saveStore : disabledSaveStore}>
          {children}
        </SessionSaveContext>
      </RemoteControlContext>
    </SessionIdContext>
  );
}

/** The ID of the session this tab is showing. */
export function useSessionId() {
  const sessionId = useContext(SessionIdContext);
  if (!sessionId) throw new Error("useSessionId must be used within BrowserServer");
  return sessionId;
}

export function useRemoteControl() {
  return useContext(RemoteControlContext);
}

export function useSessionSaveState() {
  return useStore(useContext(SessionSaveContext), (state) => state.status);
}

export function useSessionLoading() {
  return useStore(
    useContext(SessionSaveContext),
    (state) => state.status === "loading" || state.status === "load-error",
  );
}
