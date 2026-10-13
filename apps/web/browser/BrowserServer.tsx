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
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { useBrowserSession } from "./BrowserSession";
import { persistBrowserSession, type SessionSaveState } from "./persistence";
import { connectRemoteControl, type RemoteControlState } from "./remoteControl";

const disabledSaveStore = createStore<{ status: SessionSaveState }>(() => ({ status: "disabled" }));
const SessionSaveContext = createContext(disabledSaveStore);
const SessionDeletionContext = createContext<((id: string) => Promise<void>) | null>(null);
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
  const persistence = useRef<ReturnType<typeof persistBrowserSession> | null>(null);
  const [saveStore] = useState(() =>
    createStore<{ status: SessionSaveState }>(() => ({ status: "loading" })),
  );
  const [enabled, setEnabled] = useState(true);
  const [state, setState] = useState<RemoteControlState>("off");
  const remoteControl = useMemo(() => ({ state, enabled, setEnabled }), [state, enabled]);
  const sessionUrl = endpoint && `${endpoint.replace(/\/$/, "")}/sessions/${sessionId}`;
  const restoration = useMemo(() => ({ sessionUrl, session }), [sessionUrl, session]);
  const [restored, setRestored] = useState<typeof restoration | null>(null);
  const ready = restored === restoration;

  useEffect(() => {
    const { sessionUrl, session } = restoration;
    if (!sessionUrl) return;
    let loaded = false;
    const controller = persistBrowserSession(sessionUrl, session, (status) => {
      saveStore.setState({ status });
      // Both restored sessions and new sessions (404) reach saved/saving only after loading.
      if (!loaded && (status === "saved" || status === "saving")) {
        loaded = true;
        setRestored(restoration);
      }
    });
    persistence.current = controller;
    return () => {
      controller.stop();
      persistence.current = null;
    };
  }, [restoration, saveStore]);

  useEffect(() => {
    if (sessionUrl && enabled && ready)
      return connectRemoteControl(`${sessionUrl}/rpc`, session, setState);
  }, [sessionUrl, enabled, ready, session]);

  const deleteSession = useCallback(
    async (id: string) => {
      if (id === "local") throw new Error("The local session cannot be deleted");
      if (!endpoint) throw new Error("Session server is not configured");
      if (id === sessionId) {
        if (!persistence.current) throw new Error("Session is not ready");
        await persistence.current.remove();
      } else {
        const response = await fetch(`${endpoint.replace(/\/$/, "")}/sessions/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Session deletion failed");
      }
    },
    [endpoint, sessionId],
  );

  return (
    <SessionDeletionContext value={deleteSession}>
      <SessionIdContext value={sessionId}>
        <RemoteControlContext value={remoteControl}>
          <SessionSaveContext value={sessionUrl ? saveStore : disabledSaveStore}>
            {children}
          </SessionSaveContext>
        </RemoteControlContext>
      </SessionIdContext>
    </SessionDeletionContext>
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

/** Delete a saved session, stopping this tab's autosave first when deleting its active session. */
export function useDeleteSession() {
  const deleteSession = useContext(SessionDeletionContext);
  if (!deleteSession) throw new Error("useDeleteSession must be used within BrowserServer");
  return deleteSession;
}
