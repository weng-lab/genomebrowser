import type { ReactElement } from "react";
import { create } from "zustand";

export type TooltipStore = {
  show: boolean;
  x: number;
  y: number;
  content: ReactElement | undefined;
  showTooltip: (content: ReactElement, x: number, y: number) => void;
  hideTooltip: () => void;
};

export type TooltipStoreInstance = ReturnType<typeof createTooltipStore>;

export function createTooltipStore() {
  return create<TooltipStore>((set) => ({
    show: false,
    x: 0,
    y: 0,
    content: undefined,
    showTooltip: (content, x, y) => set({ show: true, content, x, y }),
    hideTooltip: () => set({ show: false, x: 0, y: 0, content: undefined }),
  }));
}
