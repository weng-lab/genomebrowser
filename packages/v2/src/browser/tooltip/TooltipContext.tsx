import { createContext, use, type ReactNode } from "react";
import type { TrackConfigBase, TrackTooltipComponent } from "../../modules/types";
import type { TooltipStore } from "./types";
import type { TooltipStoreInstance } from "./tooltipStore";

export type TooltipContextValue = {
  disabled: boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, TrackConfigBase> | undefined;
  store: TooltipStoreInstance;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipContextProvider({
  children,
  disabled,
  getTooltipComponent,
  store,
}: {
  children: ReactNode;
  disabled: boolean;
  getTooltipComponent: (type: string) => TrackTooltipComponent<any, TrackConfigBase> | undefined;
  store: TooltipStoreInstance;
}) {
  return (
    <TooltipContext.Provider value={{ disabled, getTooltipComponent, store }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipDisabled() {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.disabled;
}

export function useTooltipComponent<Item, Config extends TrackConfigBase>(type: string) {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.getTooltipComponent(type) as TrackTooltipComponent<Item, Config> | undefined;
}

export function useInternalTooltipStore<T>(selector: (state: TooltipStore) => T): T {
  const context = use(TooltipContext);
  if (!context) throw new Error("useTooltip must be used within a GenomeBrowser");
  return context.store(selector);
}
