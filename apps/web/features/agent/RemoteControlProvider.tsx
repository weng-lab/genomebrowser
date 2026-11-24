"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  exportBrowserImage,
  getDefaultImageFilename,
  type BrowserImage,
} from "@weng-lab/genomebrowser";
import { useSession } from "../sessions/SessionProvider";
import { useBrowserSvgRef } from "../browser/BrowserSvg";
import { changeTrackMetadata } from "../browser/trackMetadata";
import { sortTracks } from "../browser/trackSort";
import { addTracksFromUrls } from "../browser/urlTracks";
import { createAgentControl, type AgentControl } from "./agentControl";
import type { CommandApp } from "./commands";
import { ImagePreviewDialog } from "./components/ImagePreviewDialog";
import { connectRemoteControl, type RemoteControlState } from "./remoteControl";
import {
  useRemoteControlPreference,
  type RemoteControlPreference,
} from "./remoteControlPreference";

type RemoteControl = { state: RemoteControlState; preference: RemoteControlPreference };
const RemoteControlContext = createContext<RemoteControl | null>(null);
const AgentControlContext = createContext<AgentControl | null>(null);

/**
 * Agent control through the app's MCP endpoint, allowed by the account's saved
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
  const [control] = useState(createAgentControl);
  const remoteControl = useMemo(() => ({ state, preference }), [state, preference]);

  useEffect(() => {
    if (!enabled || !id || !stores || !signal) return;
    const app: CommandApp = {
      stores,
      sortTracks: (sort) => sortTracks(stores.useTrackStore, sort),
      changeTrackMetadata: (trackIds, change) =>
        changeTrackMetadata(stores.useTrackStore, trackIds, change),
      exportImage: (format, { filename, ...options }, signal) =>
        exportBrowserImage(
          svgRef.current,
          format,
          {
            ...options,
            filename:
              filename?.trim() || getDefaultImageFilename(stores.useBrowserStore.getState().region),
          },
          signal,
        ),
      showImage: (image) => setPreview({ image, open: true }),
      addTracksFromUrls: (requests, signal) =>
        addTracksFromUrls(stores.useTrackStore, requests, signal),
      control,
    };
    const disconnect = connectRemoteControl(`/api/sessions/${id}/commands`, app, signal, setState);
    // The agent cannot act on a session it no longer reaches, so it holds nothing: not
    // once the session ends, even while it stays open, and not once this detaches.
    signal.addEventListener("abort", control.release, { once: true });
    return () => {
      signal.removeEventListener("abort", control.release);
      disconnect();
      control.release();
    };
  }, [enabled, id, stores, signal, svgRef, control]);

  return (
    <RemoteControlContext value={remoteControl}>
      <AgentControlContext value={control}>{children}</AgentControlContext>
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

/**
 * Whether the agent holds the browser, whether taking control back also stops
 * its run, and the control it holds.
 */
export function useAgentControl() {
  const control = useAgentControlHandle();
  const held = useSyncExternalStore(control.subscribe, control.held, control.held);
  const stops = useSyncExternalStore(control.subscribe, control.stops, control.stops);
  return { held, stops, control };
}

// Outside the provider no agent reaches the browser, so control is never taken.
const unreached = createAgentControl();

/**
 * The agent's control, without following whether it is held, for code that only
 * releases or stops it. Outside `RemoteControlProvider` it is never held.
 */
export function useAgentControlHandle(): AgentControl {
  return useContext(AgentControlContext) ?? unreached;
}
