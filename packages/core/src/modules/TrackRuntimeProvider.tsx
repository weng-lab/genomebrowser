import type { ReactNode } from "react";
import type { AnyTrackInstance } from "./types";
import { bindTrackInteraction, TrackRuntime } from "./trackRuntimeState";

/** Provide a track's runtime context and bound interaction callbacks to its renderer. */
export function TrackRuntimeProvider({
  track,
  children,
}: {
  track: AnyTrackInstance;
  children: ReactNode;
}) {
  const context = { type: track.type, base: track.base, config: track.config };
  const value = { context, interaction: bindTrackInteraction(track.interaction, context) };
  return <TrackRuntime.Provider value={value}>{children}</TrackRuntime.Provider>;
}
