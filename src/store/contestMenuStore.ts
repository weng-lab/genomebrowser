import { create } from "zustand";

interface ContextMenuState {
  open: boolean;
  id: string | null;
  x: number;
  y: number;
}

interface ContextMenuStore extends ContextMenuState {
  setContextMenu: (open: boolean, id: string, x: number, y: number) => void;
}

export const useContextMenuStore = create<ContextMenuStore>((set) => ({
  open: false,
  id: null,
  x: 0,
  y: 0,
  setContextMenu: (open: boolean, id: string, x: number, y: number) => set({ open, id, x, y }),
}));
