import { create, StoreApi, UseBoundStore } from "zustand";
import { SelectionAction, SelectionState } from "./types";

export type SelectionStoreInstance = UseBoundStore<
  StoreApi<SelectionState & SelectionAction>
>;

const buildSelectionMap = (folderIds: string[]) => {
  const map = new Map<string, Set<string>>();
  folderIds.forEach((folderId) => {
    map.set(folderId, new Set<string>());
  });
  return map;
};

export function createSelectionStore(folderIds: string[]) {
  const selectedByFolder = buildSelectionMap(folderIds);
  const activeFolderId = folderIds[0] ?? "";

  const store = create<SelectionState & SelectionAction>((set) => ({
    selectedByFolder,
    activeFolderId,
    clear: (folderId?: string) =>
      set((state) => {
        if (folderId) {
          const next = new Map(state.selectedByFolder);
          next.set(folderId, new Set<string>());
          return { selectedByFolder: next };
        }

        const next = new Map<string, Set<string>>();
        state.selectedByFolder.forEach((_value, id) => {
          next.set(id, new Set<string>());
        });
        return { selectedByFolder: next };
      }),
    replaceSelection: (selection: Map<string, Set<string>>) =>
      set(() => ({
        selectedByFolder: new Map(
          Array.from(selection.entries(), ([folderId, ids]) => [
            folderId,
            new Set(ids),
          ]),
        ),
      })),
    setActiveFolder: (folderId: string) =>
      set(() => ({ activeFolderId: folderId })),
    setSelection: (folderId: string, ids: Set<string>) =>
      set((state) => {
        const next = new Map(state.selectedByFolder);
        next.set(folderId, new Set(ids));
        return { selectedByFolder: next };
      }),
  }));
  return store;
}
