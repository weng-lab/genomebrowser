import { ReactElement } from "react";
import { create } from "zustand";

export interface TooltipStore {
  show: boolean;
  x: number;
  y: number;
  content: ReactElement | undefined;
  showTooltip: (content: ReactElement, x: number, y: number) => void;
  hideTooltip: () => void;
}

export type TooltipStoreInstance = ReturnType<typeof createTooltipStore>;

export interface TooltipProps {
  x: number;
  y: number;
  content: ReactElement;
}

export function createTooltipStore() {
  return create<TooltipStore>((set) => ({
    show: false,
    content: undefined,
    x: 0,
    y: 0,
    showTooltip: (content: ReactElement, x: number, y: number) => {
      set({ show: true, content, x, y });
    },
    hideTooltip: () => set({ show: false, x: 0, y: 0, content: undefined }),
  }));
}

// Legacy export for backward compatibility
export const useTooltipStore = createTooltipStore();
