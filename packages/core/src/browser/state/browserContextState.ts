import { createContext, use } from "react";
import type { TrackMutationResult } from "../../modules/types";
import type { BrowserStoreInstance } from "./browserStore";
import type { ContextMenuStore, ContextMenuStoreInstance } from "./contextMenuStore";
import type { SettingsStore, SettingsStoreInstance } from "./settingsStore";
import type { TrackStoreInstance } from "./trackStore";

export type BrowserContextValue = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  contextMenuStore: ContextMenuStoreInstance;
  settingsStore: SettingsStoreInstance;
};

export type InteractionGateContextValue = {
  isInteractionBlocked: boolean;
};

export const BrowserContext = createContext<BrowserContextValue | null>(null);
export const InteractionGateContext = createContext<InteractionGateContextValue | null>(null);

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
  const context = use(BrowserContext);
  if (!context) throw new Error("useGenomeBrowser must be used within a GenomeBrowser");
  return { useBrowserStore: context.browserStore, useTrackStore: context.trackStore };
}

export function useContextMenuStore<T>(selector: (state: ContextMenuStore) => T): T {
  const context = use(BrowserContext);
  if (!context) throw new Error("useContextMenuStore must be used within a GenomeBrowser");
  return context.contextMenuStore(selector);
}

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  const context = use(BrowserContext);
  if (!context) throw new Error("useSettingsStore must be used within a GenomeBrowser");
  return context.settingsStore(selector);
}

export function useTrackMutationGate() {
  const context = use(InteractionGateContext);
  if (!context) throw new Error("useTrackMutationGate must be used within a GenomeBrowser");

  return {
    isInteractionBlocked: context.isInteractionBlocked,
    runTrackMutation: (mutation: () => TrackMutationResult) => {
      if (context.isInteractionBlocked) {
        return { ok: false, error: "Track interactions are currently blocked" };
      }
      return mutation();
    },
  };
}
