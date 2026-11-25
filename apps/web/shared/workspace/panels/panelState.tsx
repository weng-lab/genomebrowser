"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { Side } from "../types";

/** Each side panel's width limits, in pixels, and the width it starts at and resets to. */
export const sidePanelSizes = {
  left: { defaultWidth: 300, minWidth: 180, maxWidth: 480 },
  right: { defaultWidth: 360, minWidth: 280, maxWidth: 720 },
} satisfies Record<Side, { defaultWidth: number; minWidth: number; maxWidth: number }>;

type PanelState = {
  leftOpen: boolean;
  /** The id of the left panel a navigation entry chose. `useShownLeftPanel` reads which shows. */
  leftPanel: string | undefined;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  toggle: (side: Side) => void;
  setWidth: (side: Side, width: number) => void;
  /** Shows the left panel with `id`, opening the left side if it is collapsed. */
  showLeft: (id: string) => void;
};
function createPanelState() {
  return createStore<PanelState>((set) => ({
    leftOpen: true,
    leftPanel: undefined,
    rightOpen: true,
    leftWidth: sidePanelSizes.left.defaultWidth,
    rightWidth: sidePanelSizes.right.defaultWidth,
    toggle: (side) =>
      set((state) =>
        side === "left" ? { leftOpen: !state.leftOpen } : { rightOpen: !state.rightOpen },
      ),
    setWidth: (side, width) => set(side === "left" ? { leftWidth: width } : { rightWidth: width }),
    showLeft: (id) => set({ leftPanel: id, leftOpen: true }),
  }));
}
const PanelStateContext = createContext<ReturnType<typeof createPanelState> | null>(null);
export function PanelStateProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPanelState);
  return <PanelStateContext value={store}>{children}</PanelStateContext>;
}
export function usePanelState<T>(selector: (state: PanelState) => T): T {
  const store = useContext(PanelStateContext);
  if (!store) throw new Error("WorkspacePage must be rendered inside Workspace");
  return useStore(store, selector);
}
