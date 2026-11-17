import type { ReactNode } from "react";
import type { DrawnTrack, TrackMetadata } from "./types";
import { bindTrackInteraction, TrackRuntime } from "./trackRuntimeState";

/**
 * Provide a track's runtime context and bound interaction callbacks to its renderer.
 * `readMetadata` returns the track's current metadata from the store. The drawn track has
 * none, because a metadata edit doesn't redraw it.
 */
export function TrackRuntimeProvider({
  track,
  readMetadata,
  children,
}: {
  track: DrawnTrack;
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
