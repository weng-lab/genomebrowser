import { create } from "zustand";

interface ContextMenuState {
  open: boolean;
  id: string | null;
  x: number;
  y: number;
}

export interface ContextMenuStore extends ContextMenuState {
  setContextMenu: (open: boolean, id: string, x: number, y: number) => void;
}

export type ContextMenuStoreInstance = ReturnType<typeof createContextMenuStore>;

export function createContextMenuStore() {
  return create<ContextMenuStore>((set) => ({
    open: false,
    id: null,
    x: 0,
    y: 0,
    setContextMenu: (open: boolean, id: string, x: number, y: number) => set({ open, id, x, y }),
  }));
}

// Legacy export for backward compatibility
export const useContextMenuStore = createContextMenuStore();
