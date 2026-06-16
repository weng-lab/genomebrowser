import { create, type StoreApi, type UseBoundStore } from "zustand";

export type ContextMenuPosition = {
  x: number;
  y: number;
};

export type ContextMenuStore = {
  open: boolean;
  trackId?: string;
  position: ContextMenuPosition;
  openContextMenu: (trackId: string, position: ContextMenuPosition) => void;
  closeContextMenu: () => void;
};

export type ContextMenuStoreInstance = UseBoundStore<StoreApi<ContextMenuStore>>;

export function createContextMenuStore(): ContextMenuStoreInstance {
  return create<ContextMenuStore>((set) => ({
    open: false,
    trackId: undefined,
    position: { x: 0, y: 0 },
    openContextMenu: (trackId, position) => set({ open: true, trackId, position }),
    closeContextMenu: () => set({ open: false }),
  }));
}
