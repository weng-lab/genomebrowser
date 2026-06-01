import { createContext, useContext, type ReactNode } from "react";
import type { TrackStore, TrackStoreInstance } from "./trackStore";

type BrowserContextValue = {
  trackStore: TrackStoreInstance;
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
