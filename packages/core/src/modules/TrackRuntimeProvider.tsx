import type { ReactNode } from "react";
import type { AnyTrackInstance, TrackMetadata } from "./types";
import { bindTrackInteraction, TrackRuntime } from "./trackRuntimeState";

/**
 * Provide a track's runtime context and bound interaction callbacks to its renderer.
 * `readMetadata` returns the track's current metadata. The drawn track keeps its old
 * metadata, because a metadata edit doesn't redraw it.
 */
export function TrackRuntimeProvider({
  track,
  readMetadata,
  children,
}: {
  track: AnyTrackInstance;
  readMetadata: () => TrackMetadata | undefined;
  children: ReactNode;
}) {
  const getContext = () => ({
    type: track.type,
    base: track.base,
    config: track.config,
    metadata: readMetadata() ?? {},
  });
  const value = { getContext, interaction: bindTrackInteraction(track.interaction, getContext) };
  return <TrackRuntime.Provider value={value}>{children}</TrackRuntime.Provider>;
}
