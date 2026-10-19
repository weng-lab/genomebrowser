"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession, useSessionState } from "../sessions/SessionProvider";
import { connectRemoteControl, type RemoteControlState } from "./remoteControl";

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

/**
 * Optional agent control through the MCP server. Off until enabled in Settings.
 * While enabled, it attaches to the active session once restored, disconnecting
 * from the previous session first. Sessions open and save without it.
 */
export function RemoteControlProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<RemoteControlState>("off");
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  const read = useSessionState();
  const remoteControl = useMemo(() => ({ state, enabled, setEnabled }), [state, enabled]);

  useEffect(() => {
    if (!enabled || !id || !stores) return;
    // The session can be replaced before this effect cleans up.
    const open = () => (read().active?.stores === stores ? stores : undefined);
    return connectRemoteControl(`/api/sessions/${id}/rpc`, open, setState);
  }, [enabled, id, stores, read]);

  return <RemoteControlContext value={remoteControl}>{children}</RemoteControlContext>;
}

export function useRemoteControl() {
  return useContext(RemoteControlContext);
}
