import { createContext, useContext, type ReactNode } from "react";
import type { SettingsStore, SettingsStoreInstance } from "../settings/settingsStore";
import type { TrackStore, TrackStoreInstance } from "./trackStore";
import type { TooltipStore, TooltipStoreInstance } from "./tooltipStore";

type BrowserContextValue = {
  trackStore: TrackStoreInstance;
  settingsStore: SettingsStoreInstance;
  tooltipStore: TooltipStoreInstance;
  svg: SVGSVGElement | null;
};

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BrowserContextValue;
}) {
  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}

export function useTrackStore<T>(selector: (state: TrackStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) throw new Error("useTrackStore must be used within a GenomeBrowser");
  return context.trackStore(selector);
}

export function useTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) throw new Error("useTooltipStore must be used within a GenomeBrowser");
  return context.tooltipStore(selector);
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) throw new Error("useSettingsStore must be used within a GenomeBrowser");
  return context.settingsStore(selector);
}

export function useBrowserSvg() {
  const context = useContext(BrowserContext);
  if (!context) throw new Error("useBrowserSvg must be used within a GenomeBrowser");
  return context.svg;
}
