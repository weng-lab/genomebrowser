import { createContext, use, type ReactNode } from "react";
import type { TooltipStore } from "./types";
import type { TooltipStoreInstance } from "./tooltipStore";

const TooltipContext = createContext<TooltipStoreInstance | null>(null);

export function TooltipContextProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: TooltipStoreInstance;
}) {
  return <TooltipContext.Provider value={store}>{children}</TooltipContext.Provider>;
}

export function useInternalTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const store = use(TooltipContext);
  if (!store) throw new Error("useTooltip must be used within a GenomeBrowser");
  return store(selector);
}
