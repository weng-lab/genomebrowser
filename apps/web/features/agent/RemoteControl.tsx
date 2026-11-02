"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  exportBrowserImage,
  getDefaultImageFilename,
  type BrowserImage,
} from "@weng-lab/genomebrowser";
import { useSession } from "../sessions/SessionProvider";
import { useBrowserSvgRef } from "../browser/BrowserSvg";
import { ImagePreviewDialog } from "./components/ImagePreviewDialog";
import type { CommandApp } from "./commands";
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
 * Optional agent control of the open session. Off until enabled in Settings.
 * While enabled, it attaches to the active session once restored. It detaches
 * as soon as that session is replaced or closed, or can no longer save edits.
 * Sessions open and save without it. Images that agents export are shown in a
 * preview, which stays open until the user closes or downloads it.
 */
export function RemoteControlProvider({ children }: { children: ReactNode }) {
  const svgRef = useBrowserSvgRef();
  // Names this tab, so it can reconnect while it holds its session's commands.
  const [tabId] = useState(() => crypto.randomUUID());
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<RemoteControlState>("off");
  // The image stays while the preview animates closed, then is released.
  const [preview, setPreview] = useState<{ image: BrowserImage; open: boolean } | null>(null);
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  const signal = useSession((session) => session.active?.signal);
  const remoteControl = useMemo(() => ({ state, enabled, setEnabled }), [state, enabled]);

  useEffect(() => {
    if (!enabled || !id || !stores || !signal) return;
    const app: CommandApp = {
      stores,
      exportImage: (format, { filename, ...options }, signal) => {
        const name =
          filename?.trim() || getDefaultImageFilename(stores.useBrowserStore.getState().region);
        return exportBrowserImage(svgRef.current, format, { ...options, filename: name }, signal);
      },
      showImage: (image) => setPreview({ image, open: true }),
    };
    return connectRemoteControl(`/api/sessions/${id}/commands?tab=${tabId}`, app, signal, setState);
  }, [enabled, id, stores, signal, svgRef, tabId]);

  return (
    <RemoteControlContext value={remoteControl}>
      {children}
      <ImagePreviewDialog
        image={preview?.image ?? null}
        open={preview?.open ?? false}
        onClose={() => setPreview((current) => current && { ...current, open: false })}
        // A new export can open while the previous one animates closed; keep it.
        onExited={() => setPreview((current) => (current?.open ? current : null))}
      />
    </RemoteControlContext>
  );
}

export function useRemoteControl() {
  return useContext(RemoteControlContext);
}
