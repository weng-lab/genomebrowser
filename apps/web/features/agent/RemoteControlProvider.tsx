"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BrowserImage } from "@weng-lab/genomebrowser";
import { useSession } from "../sessions/SessionProvider";
import { useBrowserSvgRef } from "../browser/BrowserSvg";
import { ImagePreviewDialog } from "./components/ImagePreviewDialog";
import { connectRemoteControl, type RemoteControlState } from "./remoteControl";
import {
  useRemoteControlPreference,
  type RemoteControlPreference,
} from "./remoteControlPreference";

type RemoteControl = { state: RemoteControlState; preference: RemoteControlPreference };
const RemoteControlContext = createContext<RemoteControl | null>(null);

/**
 * Agent control through the MCP server, allowed by the account's saved
 * preference, which new accounts start with on. While allowed, it attaches to
 * the active session once restored. It detaches as soon as that session is
 * replaced or closed, or can no longer save edits, or the preference turns off.
 * Sessions open and save without it. Images that agents export are shown in a
 * preview, which stays open until the user closes or downloads it. Mount it once
 * per account.
 */
export function RemoteControlProvider({ children }: { children: ReactNode }) {
  const svgRef = useBrowserSvgRef();
  const preference = useRemoteControlPreference();
  const enabled = preference.allowed;
  const [state, setState] = useState<RemoteControlState>("off");
  // The image stays while the preview animates closed, then is released.
  const [preview, setPreview] = useState<{ image: BrowserImage; open: boolean } | null>(null);
  const id = useSession((session) => session.active?.id);
  const stores = useSession((session) => session.active?.stores);
  const signal = useSession((session) => session.active?.signal);
  const remoteControl = useMemo(() => ({ state, preference }), [state, preference]);

  useEffect(() => {
    if (!enabled || !id || !stores || !signal) return;
    const showImage = (image: BrowserImage) => setPreview({ image, open: true });
    const getBrowserSvg = () => svgRef.current;
    return connectRemoteControl(
      `/rpc/${id}`,
      { stores, getBrowserSvg, showImage },
      signal,
      setState,
    );
  }, [enabled, id, stores, signal, svgRef]);

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
  const remoteControl = useContext(RemoteControlContext);
  if (!remoteControl) throw new Error("RemoteControlProvider is required");
  return remoteControl;
}
