import { createContext, use } from "react";
import type { TrackRuntimeContext } from "./types";

export const runtimeContext = createContext<TrackRuntimeContext | null>(null);

export function useTrackRuntimeContext<Config>(): TrackRuntimeContext<Config> {
  const context = use(runtimeContext);
  if (!context) throw new Error("Track runtime context must be used within a track renderer");
  return context as TrackRuntimeContext<Config>;
}
