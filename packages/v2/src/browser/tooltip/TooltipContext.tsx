import { createContext, use, useMemo, type ReactNode } from "react";
import type { TrackTooltipComponent } from "../../modules/types";
import type { TooltipStore } from "./types";
import type { TooltipStoreInstance } from "./tooltipStore";

export type TooltipContextValue = {
  isDisabled: () => boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, any> | undefined;
  store: TooltipStoreInstance;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipContextProvider({
  children,
  isDisabled,
  getTooltipComponent,
  store,
}: {
  children: ReactNode;
  isDisabled: () => boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, any> | undefined;
  store: TooltipStoreInstance;
}) {
  const value = useMemo(
    () => ({ isDisabled, getTooltipComponent, store }),
    [isDisabled, getTooltipComponent, store],
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export function useTooltipDisabled() {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.isDisabled;
}

export function useTooltipComponent<Item, Config>(type: string) {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.getTooltipComponent(type) as TrackTooltipComponent<Item, Config> | undefined;
}

export function useInternalTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.store(selector);
}
