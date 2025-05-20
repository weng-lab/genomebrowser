import { ReactElement } from "react";
import { create } from "zustand";

interface TooltipStore {
  show: boolean;
  x: number;
  y: number;
  content: ReactElement | undefined;
  showTooltip: (content: ReactElement, x: number, y: number) => void;
  hideTooltip: () => void;
}

export interface TooltipProps {
  x: number;
  y: number;
  content: ReactElement;
}

export const useTooltipStore = create<TooltipStore>((set) => ({
  show: false,
  content: undefined,
  x: 0,
  y: 0,
  showTooltip: (content: ReactElement, x: number, y: number) => {
    set({ show: true, content, x, y });
  },
  hideTooltip: () => set({ show: false, x: 0, y: 0, content: undefined }),
}));
