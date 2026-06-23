import { createContext, use, type ReactNode } from "react";
import type { TrackMutationResult } from "../../modules/types";
import type { SettingsStore, SettingsStoreInstance } from "./settingsStore";
import type { BrowserStore, BrowserStoreInstance } from "./browserStore";
import type { ContextMenuStore, ContextMenuStoreInstance } from "./contextMenuStore";
import type { TrackStore, TrackStoreInstance } from "./trackStore";

type BrowserContextValue = {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  contextMenuStore: ContextMenuStoreInstance;
  settingsStore: SettingsStoreInstance;
  isPanning: boolean;
  isInteractionBlocked: boolean;
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
  const context = use(BrowserContext);
  if (!context) throw new Error("useTrackStore must be used within a GenomeBrowser");
  return context.trackStore(selector);
}

export function useBrowserStore<T>(selector: (state: BrowserStore) => T): T {
  const context = use(BrowserContext);
  if (!context) throw new Error("useBrowserStore must be used within a GenomeBrowser");
  return context.browserStore(selector);
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
  const context = use(BrowserContext);
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
