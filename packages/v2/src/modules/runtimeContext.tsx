import type { ReactNode } from "react";
import { runtimeContext } from "./runtimeContextState";
import type { TrackRuntimeContext } from "./types";

export function TrackRuntimeContextProvider({
  children,
  context,
}: {
  children: ReactNode;
  context: TrackRuntimeContext;
}) {
  return <runtimeContext.Provider value={context}>{children}</runtimeContext.Provider>;
}
