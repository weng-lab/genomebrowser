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
  if (typeof sessionStorage === "undefined") {
    return undefined;
  }

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

const saveToStorage = (
  selection: Map<string, Set<string>>,
  storageKey: string,
) => {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  try {
    const serialized = serializeSelection(selection);
    sessionStorage.setItem(storageKey, JSON.stringify(serialized));
  } catch {
    // Ignore storage errors
  }
};

const buildSelectionMap = (
  folderIds: string[],
  defaultManagedIds?: Map<string, Set<string>>,
) => {
  const map = new Map<string, Set<string>>();
  folderIds.forEach((folderId) => {
    const initial = defaultManagedIds?.get(folderId);
    map.set(folderId, initial ? new Set(initial) : new Set<string>());
  });
  return map;
};

export function createSelectionStore(
  folderIds: string[],
  storageKey: string = DEFAULT_STORAGE_KEY,
  defaultManagedIds?: Map<string, Set<string>>,
) {
  const storedSelection = loadFromStorage(storageKey);
  // Storage wins: use stored if exists, else fall back to default managed IDs.
  const selectedByFolder = buildSelectionMap(
    folderIds,
    storedSelection ?? defaultManagedIds,
  );
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

  // Subscribe to changes and persist to storage
  store.subscribe((state) => {
    saveToStorage(state.selectedByFolder, storageKey);
  });

  return store;
}
