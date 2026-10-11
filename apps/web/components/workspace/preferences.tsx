"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { Side } from "./types";

type Preferences = {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  toggle: (side: Side) => void;
  setWidth: (side: Side, width: number) => void;
};
function createPreferences() {
  return createStore<Preferences>((set) => ({
    leftOpen: true,
    rightOpen: true,
    leftWidth: 240,
    rightWidth: 360,
    toggle: (side) =>
      set((state) =>
        side === "left" ? { leftOpen: !state.leftOpen } : { rightOpen: !state.rightOpen },
      ),
    setWidth: (side, width) => set(side === "left" ? { leftWidth: width } : { rightWidth: width }),
  }));
}
const PreferencesContext = createContext<ReturnType<typeof createPreferences> | null>(null);
export function WorkspacePreferences({ children }: { children: ReactNode }) {
  const [store] = useState(createPreferences);
  return <PreferencesContext value={store}>{children}</PreferencesContext>;
}
export function useWorkspacePreferences<T>(selector: (state: Preferences) => T): T {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error("WorkspacePage must be rendered inside Workspace");
  return useStore(store, selector);
}
