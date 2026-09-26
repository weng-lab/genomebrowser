import { createContext, use } from "react";
import type { TrackMutationResult } from "../../modules/types";
import type { TrackDataController } from "../data/trackDataController";
import type { TooltipStore } from "../tooltip/types";
import { createTooltipStore, type TooltipStoreInstance } from "../tooltip/tooltipStore";
import type { BrowserStoreInstance } from "./browserStore";
import {
  createContextMenuStore,
  type ContextMenuStore,
  type ContextMenuStoreInstance,
} from "./contextMenuStore";
import {
  createSettingsStore,
  type SettingsStore,
  type SettingsStoreInstance,
} from "./settingsStore";
import type { TrackStoreInstance } from "./trackStore";

/**
 * One mounted browser's stores and stable callbacks. The value never changes after
 * mount; components subscribe to changing state through the stores' selectors.
 */
/** The parts of a browser's data controller that components subscribe to. */
export type BrowserDataSource = Pick<
  TrackDataController,
  "subscribe" | "getTrack" | "getBasePairDetail" | "getBasePairDetailStatus"
>;

export type BrowserContextValue = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  /** Per-track results and the base-pair detail gate, read with `useSyncExternalStore`. */
  dataController: BrowserDataSource;
  contextMenuStore: ContextMenuStoreInstance;
  settingsStore: SettingsStoreInstance;
  tooltipStore: TooltipStoreInstance;
  /** Whether a pan drag is in progress. Read at call time, not subscribed. */
  isPanDragging: () => boolean;
};

export const BrowserContext = createContext<BrowserContextValue | null>(null);

/** Create one browser's context value with private menu, settings, and tooltip stores. */
export function createBrowserContextValue(
  browserStore: BrowserStoreInstance,
  trackStore: TrackStoreInstance,
  dataController: BrowserDataSource,
  isPanDragging: () => boolean,
): BrowserContextValue {
  return {
    browserStore,
    trackStore,
    dataController,
    contextMenuStore: createContextMenuStore(),
    settingsStore: createSettingsStore(),
    tooltipStore: createTooltipStore(),
    isPanDragging,
  };
}

function useBrowserContext(hook: string) {
  const context = use(BrowserContext);
  if (!context) throw new Error(`${hook} must be used within a GenomeBrowser`);
  return context;
}

/** The hosting browser's bound Zustand stores, including their imperative APIs. */
export type GenomeBrowserStores = {
  useBrowserStore: BrowserStoreInstance;
  useTrackStore: TrackStoreInstance;
};

/**
 * Resolve the nearest GenomeBrowser's stores without subscribing to their state.
 * Call a returned store hook with a selector to subscribe. Available to hosted
 * renderers, settings, and tooltips; throws outside a GenomeBrowser.
 */
export function useGenomeBrowser(): GenomeBrowserStores {
  const context = useBrowserContext("useGenomeBrowser");
  return { useBrowserStore: context.browserStore, useTrackStore: context.trackStore };
}

export function useDataController() {
  return useBrowserContext("useDataController").dataController;
}

export function useRegistry() {
  return useBrowserContext("useRegistry").trackStore((state) => state.registry);
}

export function useContextMenuStore<T>(selector: (state: ContextMenuStore) => T): T {
  return useBrowserContext("useContextMenuStore").contextMenuStore(selector);
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  return useBrowserContext("useSettingsStore").settingsStore(selector);
}

export function useTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  return useBrowserContext("useTooltip").tooltipStore(selector);
}

export function useIsPanDragging() {
  return useBrowserContext("useTooltip").isPanDragging;
}

/** Whether pending track requests block pan, zoom, selection, reordering and settings. */
export function useIsInteractionBlocked() {
  return useBrowserContext("useIsInteractionBlocked").browserStore((state) => state.isLoading);
}

export function useTrackMutationGate() {
  const isInteractionBlocked = useIsInteractionBlocked();

  return {
    isInteractionBlocked,
    runTrackMutation: (mutation: () => TrackMutationResult): TrackMutationResult => {
      if (isInteractionBlocked) {
        return {
          ok: false,
          code: "INTERACTION_BLOCKED",
          error: "Track interactions are currently blocked",
        };
      }
      return mutation();
    },
  };
}
