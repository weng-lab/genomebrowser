import { create, StoreApi, UseBoundStore } from "zustand";
import { SelectionState, SelectionAction, RowInfo } from "./types";

export type SelectionStoreInstance = UseBoundStore<
  StoreApi<SelectionState & SelectionAction>
>;

export function createSelectionStore(initialTracks?: Map<string, RowInfo>) {
  return create<SelectionState & SelectionAction>((set, get) => ({
    maxTracks: 30,
    selectedTracks: initialTracks ? new Map(initialTracks) : new Map<string, RowInfo>(),
    selectedIds: () => new Set(get().selectedTracks.keys()),
    setSelected: (tracks: Map<string, RowInfo>) =>
      set(() => ({
        selectedTracks: new Map(tracks),
      })),
    removeIds: (removedIds: Set<string>) =>
      set((state) => {
        const next = new Map(state.selectedTracks);
        removedIds.forEach((id) => {
          next.delete(id);
        });
        return { selectedTracks: next };
      }),
    clear: () => set(() => ({ selectedTracks: new Map<string, RowInfo>() })),
  }));
}
