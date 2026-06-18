import { createContext, use, type ReactNode } from "react";
import type { TooltipStore } from "./types";
import type { TooltipStoreInstance } from "./tooltipStore";

export type TooltipContextValue = {
  disabled: boolean;
  store: TooltipStoreInstance;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipContextProvider({
  children,
  disabled,
  store,
}: {
  children: ReactNode;
  disabled: boolean;
  store: TooltipStoreInstance;
}) {
  return <TooltipContext.Provider value={{ disabled, store }}>{children}</TooltipContext.Provider>;
}

export function useTooltipDisabled() {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.disabled;
}

export function useInternalTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.store(selector);
}
