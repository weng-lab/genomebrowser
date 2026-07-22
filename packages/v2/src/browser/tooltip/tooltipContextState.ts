import { createContext, use } from "react";
import type { AnyTrackTooltipComponent, TrackTooltipComponent } from "../../modules/types";
import type { TooltipStore } from "./types";
import type { TooltipStoreInstance } from "./tooltipStore";

export type TooltipContextValue = {
  isDisabled: () => boolean;
  getTooltipComponent: (type: string) => AnyTrackTooltipComponent | undefined;
  store: TooltipStoreInstance;
};

export const TooltipContext = createContext<TooltipContextValue | null>(null);

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
