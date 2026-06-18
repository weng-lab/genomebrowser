import { create } from "zustand";
import type { TooltipStore } from "./types";

export type TooltipStoreInstance = ReturnType<typeof createTooltipStore>;

export function createTooltipStore() {
  return create<TooltipStore>((set) => ({
    isVisible: false,
    content: undefined,
    anchor: { x: 0, y: 0 },
    show: (content, anchor) => set({ isVisible: true, content, anchor }),
    hide: () => set({ isVisible: false, content: undefined, anchor: { x: 0, y: 0 } }),
  }));
}
