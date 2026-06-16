import { createContext, use, type ReactElement, type ReactNode } from "react";
import type { TrackConfigBase, TrackSettingsUpdate } from "../types";

export type ModuleRuntime = {
  svg: SVGSVGElement | null;
  isPanning: boolean;
  showTooltip: (content: ReactElement, x: number, y: number) => void;
  hideTooltip: () => void;
  getTrackHeight: (trackId: string) => number | undefined;
  updateTrack: <Config extends TrackConfigBase>(
    trackId: string,
    partial: TrackSettingsUpdate<Config>,
  ) => void;
};

const ModuleRuntimeContext = createContext<ModuleRuntime | null>(null);

export function ModuleRuntimeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ModuleRuntime;
}) {
  return <ModuleRuntimeContext.Provider value={value}>{children}</ModuleRuntimeContext.Provider>;
}

export function useModuleRuntime() {
  const runtime = use(ModuleRuntimeContext);
  if (!runtime) throw new Error("Module runtime hooks must be used within a GenomeBrowser");
  return runtime;
}
