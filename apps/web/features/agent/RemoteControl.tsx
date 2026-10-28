"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BrowserImage } from "@weng-lab/genomebrowser";
import { useSession } from "../sessions/SessionProvider";
import { ImagePreviewDialog } from "./components/ImagePreviewDialog";
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
 * While enabled, it attaches to the active session once restored. It detaches
 * as soon as that session is replaced or closed, or can no longer save edits.
 * Sessions open and save without it. Images that agents export are shown in a
 * preview, which stays open until the user closes or downloads it.
 */
export function RemoteControlProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<RemoteControlState>("off");
  // The image stays while the preview animates closed.
  const [preview, setPreview] = useState<{ image: BrowserImage; open: boolean } | null>(null);
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  const signal = useSession((session) => session.active?.signal);
  const remoteControl = useMemo(() => ({ state, enabled, setEnabled }), [state, enabled]);

  useEffect(() => {
    if (!enabled || !id || !stores || !signal) return;
    const showImage = (image: BrowserImage) => setPreview({ image, open: true });
    return connectRemoteControl(`/rpc/${id}`, { stores, showImage }, signal, setState);
  }, [enabled, id, stores, signal]);

  return (
    <RemoteControlContext value={remoteControl}>
      {children}
      <ImagePreviewDialog
        image={preview?.image ?? null}
        open={preview?.open ?? false}
        onClose={() => setPreview((current) => current && { ...current, open: false })}
      />
    </RemoteControlContext>
  );
}

export function useRemoteControl() {
  return useContext(RemoteControlContext);
}
