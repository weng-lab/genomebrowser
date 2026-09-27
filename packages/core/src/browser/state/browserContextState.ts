import { createContext, use } from "react";
import type { TrackMutationResult } from "../../modules/types";
import type { TrackDataController } from "../data/trackDataController";
import type { TooltipStore } from "../tooltip/types";
import type { TooltipStoreInstance } from "../tooltip/tooltipStore";
import type { BrowserStoreInstance } from "./browserStore";
import type { ContextMenuStore, ContextMenuStoreInstance } from "./contextMenuStore";
import type { SettingsStore, SettingsStoreInstance } from "./settingsStore";
import type { TrackStoreInstance } from "./trackStore";

/** The parts of a browser's data controller that components subscribe to. */
export type BrowserDataSource = Pick<
  TrackDataController,
  "subscribe" | "getTrack" | "getBasePairDetail" | "getBasePairDetailStatus"
>;

/** Replaced with the supplied store pair; store state uses selector subscriptions. */
export type BrowserContextValue = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  /** Per-track results and the base-pair detail gate, read with `useSyncExternalStore`. */
  dataController: BrowserDataSource;
  contextMenuStore: ContextMenuStoreInstance;
  settingsStore: SettingsStoreInstance;
  tooltipStore: TooltipStoreInstance;
};

export const BrowserContext = createContext<BrowserContextValue | null>(null);

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
  const useTrackStore = useBrowserContext("useRegistry").trackStore;
  return useTrackStore((state) => state.registry);
}

export function useContextMenuStore<T>(selector: (state: ContextMenuStore) => T): T {
  const useStore = useBrowserContext("useContextMenuStore").contextMenuStore;
  return useStore(selector);
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  const useStore = useBrowserContext("useSettingsStore").settingsStore;
  return useStore(selector);
}

export function useTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const useStore = useBrowserContext("useTooltip").tooltipStore;
  return useStore(selector);
}

/** Whether pending track requests block pan, zoom, selection, reordering and settings. */
export function useIsInteractionBlocked() {
  const useBrowserStore = useBrowserContext("useIsInteractionBlocked").browserStore;
  return useBrowserStore((state) => state.isLoading);
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
