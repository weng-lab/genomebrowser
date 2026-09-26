import type { ReactNode } from "react";
import { createTooltipStore } from "../tooltip/tooltipStore";
import type { BrowserStoreInstance } from "./browserStore";
import { BrowserContext, type BrowserContextValue } from "./browserContextState";
import { createContextMenuStore } from "./contextMenuStore";
import { createSettingsStore } from "./settingsStore";
import type { TrackStoreInstance } from "./trackStore";

/** Create one browser's context value with private menu, settings, and tooltip stores. */
export function createBrowserContextValue(
  browserStore: BrowserStoreInstance,
  trackStore: TrackStoreInstance,
  isPanDragging: () => boolean,
): BrowserContextValue {
  return {
    browserStore,
    trackStore,
    contextMenuStore: createContextMenuStore(),
    settingsStore: createSettingsStore(),
    tooltipStore: createTooltipStore(),
    isPanDragging,
  };
}

export function BrowserProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: BrowserContextValue;
}) {
  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}
