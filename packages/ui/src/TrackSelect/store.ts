import { create, StoreApi, UseBoundStore } from "zustand";
import { SelectionState, SelectionAction } from "./types";

export type SelectionStoreInstance = UseBoundStore<
  StoreApi<SelectionState & SelectionAction>
>;

export function createSelectionStore() {
  return create<SelectionState & SelectionAction>((set) => ({
    maxTracks: 30,
    selectedIds: new Set<string>(),
    setSelected: (ids: Set<string>) =>
      set(() => ({
        selectedIds: new Set(ids),
      })),
    removeIds: (removedIds: Set<string>) =>
      set((state) => {
        const next = new Set(state.selectedIds);
        removedIds.forEach((id) => {
          next.delete(id);
        });
        return { selectedIds: next };
      }),
    clear: () => set(() => ({ selectedIds: new Set<string>() })),
  }));
}
