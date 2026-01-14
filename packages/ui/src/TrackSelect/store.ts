import { create, StoreApi, UseBoundStore } from "zustand";
import { SelectionAction, SelectionState } from "./types";

export type SelectionStoreInstance = UseBoundStore<
  StoreApi<SelectionState & SelectionAction>
>;

const DEFAULT_STORAGE_KEY = "trackSelect_selection";

type SerializedSelection = Record<string, string[]>;

const serializeSelection = (
  selection: Map<string, Set<string>>,
): SerializedSelection => {
  const obj: SerializedSelection = {};
  selection.forEach((ids, folderId) => {
    obj[folderId] = Array.from(ids);
  });
  return obj;
};

const deserializeSelection = (
  data: SerializedSelection,
): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  Object.entries(data).forEach(([folderId, ids]) => {
    map.set(folderId, new Set(ids));
  });
  return map;
};

const loadFromStorage = (
  storageKey: string,
): Map<string, Set<string>> | undefined => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as SerializedSelection;
      return deserializeSelection(parsed);
    }
  } catch {
    // Ignore storage errors
  }
  return undefined;
};

const saveToStorage = (selection: Map<string, Set<string>>, storageKey: string) => {
  try {
    const serialized = serializeSelection(selection);
    sessionStorage.setItem(storageKey, JSON.stringify(serialized));
  } catch {
    // Ignore storage errors
  }
};

const buildSelectionMap = (
  folderIds: string[],
  initialSelection?: Map<string, Set<string>>,
) => {
  const map = new Map<string, Set<string>>();
  folderIds.forEach((folderId) => {
    const initial = initialSelection?.get(folderId);
    map.set(folderId, initial ? new Set(initial) : new Set<string>());
  });
  return map;
};

export function createSelectionStore(
  folderIds: string[],
  storageKey: string = DEFAULT_STORAGE_KEY,
) {
  const storedSelection = loadFromStorage(storageKey);
  const selectedByFolder = buildSelectionMap(folderIds, storedSelection);
  const activeFolderId = folderIds[0] ?? "";

  const store = create<SelectionState & SelectionAction>((set, get) => ({
    selectedByFolder,
    activeFolderId,
    select: (folderId: string, ids: Set<string>) =>
      set((state) => {
        const next = new Map(state.selectedByFolder);
        const current = next.get(folderId) ?? new Set<string>();
        const nextSet = new Set(current);
        ids.forEach((id) => nextSet.add(id));
        next.set(folderId, nextSet);
        return { selectedByFolder: next };
      }),
    deselect: (folderId: string, ids: Set<string>) =>
      set((state) => {
        const next = new Map(state.selectedByFolder);
        const current = next.get(folderId) ?? new Set<string>();
        const nextSet = new Set(current);
        ids.forEach((id) => nextSet.delete(id));
        next.set(folderId, nextSet);
        return { selectedByFolder: next };
      }),
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
    setActiveFolder: (folderId: string) =>
      set(() => ({ activeFolderId: folderId })),
    getAllSelectedIds: () => {
      const all = new Set<string>();
      get().selectedByFolder.forEach((ids) => {
        ids.forEach((id) => all.add(id));
      });
      return all;
    },
    getSelectedForFolder: (folderId: string) =>
      new Set(get().selectedByFolder.get(folderId) ?? []),
    getTotalCount: () => {
      let total = 0;
      get().selectedByFolder.forEach((ids) => {
        total += ids.size;
      });
      return total;
    },
    setSelection: (folderId: string, ids: Set<string>) =>
      set((state) => {
        const next = new Map(state.selectedByFolder);
        next.set(folderId, new Set(ids));
        return { selectedByFolder: next };
      }),
  }));

  // Subscribe to changes and persist to storage
  store.subscribe((state) => {
    saveToStorage(state.selectedByFolder, storageKey);
  });

  return store;
}
