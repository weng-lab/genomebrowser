import { create } from "zustand";

export interface ModalStore {
  id: string;
  position: { x: number; y: number };
  open: boolean;
  closeModal: () => void;
  showModal: (id: string, position: { x: number; y: number }) => void;
}

export type ModalStoreInstance = ReturnType<typeof createModalStore>;

export function createModalStore() {
  return create<ModalStore>((set) => ({
    id: "",
    position: { x: 0, y: 0 },
    open: false,
    closeModal: () => set({ open: false }),
    showModal: (id: string, position: { x: number; y: number }) => set({ open: true, id, position }),
  }));
}

// Legacy export for backward compatibility
export const useModalStore = createModalStore();
