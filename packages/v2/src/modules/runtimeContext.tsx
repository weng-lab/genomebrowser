import { createContext, use, type ReactNode } from "react";
import type { TrackRuntimeContext } from "./types";

const runtimeContext = createContext<TrackRuntimeContext | null>(null);

export function TrackRuntimeContextProvider({
  children,
  context,
}: {
  children: ReactNode;
  context: TrackRuntimeContext;
}) {
  return <runtimeContext.Provider value={context}>{children}</runtimeContext.Provider>;
}

export function useTrackRuntimeContext<Config>(): TrackRuntimeContext<Config> {
  const context = use(runtimeContext);
  if (!context) throw new Error("Track runtime context must be used within a track renderer");
  return context as TrackRuntimeContext<Config>;
}
