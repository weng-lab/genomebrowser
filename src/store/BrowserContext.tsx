import { createContext, useContext, ReactNode } from "react";
import { BrowserStoreInstance, BrowserStore } from "./browserStore";
import { TrackStoreInstance, TrackStore } from "./trackStore";
import { DataStoreInstance, DataStore } from "./dataStore";
import { ContextMenuStoreInstance, ContextMenuStore } from "./contextMenuStore";
import { ModalStoreInstance, ModalStore } from "./modalStore";
import { TooltipStoreInstance, TooltipStore } from "./tooltipStore";
import { ThemeStoreInstance, ThemeStore } from "./themeStore";

interface BrowserContextValue {
  browserStore: BrowserStoreInstance;
  trackStore: TrackStoreInstance;
  dataStore: DataStoreInstance;
  contextMenuStore: ContextMenuStoreInstance;
  modalStore: ModalStoreInstance;
  tooltipStore: TooltipStoreInstance;
  themeStore: ThemeStoreInstance;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

interface BrowserProviderProps {
  children: ReactNode;
  value: BrowserContextValue;
}

export function BrowserProvider({ children, value }: BrowserProviderProps) {
  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
}

// Context-aware hooks that replace global store hooks
export function useBrowserStore<T>(selector: (state: BrowserStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useBrowserStore must be used within a Browser component");
  }

  return context.browserStore(selector) as any;
}

export function useTrackStore<T>(selector: (state: TrackStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useTrackStore must be used within a Browser component");
  }

  return context.trackStore(selector) as any;
}

export function useDataStore<T>(selector: (state: DataStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useDataStore must be used within a Browser component");
  }

  return context.dataStore(selector) as any;
}

export function useContextMenuStore<T>(selector: (state: ContextMenuStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useContextMenuStore must be used within a Browser component");
  }

  return context.contextMenuStore(selector) as any;
}

export function useModalStore<T>(selector: (state: ModalStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useModalStore must be used within a Browser component");
  }

  return context.modalStore(selector) as any;
}

export function useTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useTooltipStore must be used within a Browser component");
  }

  return context.tooltipStore(selector) as any;
}

export function useTheme<T>(selector: (state: ThemeStore) => T): T {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useTheme must be used within a Browser component");
  }

  return context.themeStore(selector) as any;
}
