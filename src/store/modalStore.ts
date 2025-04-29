import { create } from "zustand";

interface ModalStore {
  id: string;
  position: { x: number; y: number };
  open: boolean;
  closeModal: () => void;
  showModal: (id: string, position: { x: number; y: number }) => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  id: "",
  position: { x: 0, y: 0 },
  open: false,
  closeModal: () => set({ open: false }),
  showModal: (id: string, position: { x: number; y: number }) => set({ open: true, id, position }),
}));
