"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { Side } from "../types";

type PanelState = {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  toggle: (side: Side) => void;
  setWidth: (side: Side, width: number) => void;
};
function createPanelState() {
  return createStore<PanelState>((set) => ({
    leftOpen: true,
    rightOpen: false,
    leftWidth: 240,
    rightWidth: 360,
    toggle: (side) =>
      set((state) =>
        side === "left" ? { leftOpen: !state.leftOpen } : { rightOpen: !state.rightOpen },
      ),
    setWidth: (side, width) => set(side === "left" ? { leftWidth: width } : { rightWidth: width }),
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
