import { useMemo } from "react";
import { create } from "zustand";

export type TrackDataState<T = any> = {
  data: T | null;
  error: string | null;
};

export interface DataStore {
  trackData: Map<string, TrackDataState>;
  isFetching: boolean;
  setTrackData: (id: string, state: TrackDataState) => void;
  setMultipleTrackData: (updates: Array<{ id: string; state: TrackDataState }>) => void;
  setFetching: (isFetching: boolean) => void;
  reset: () => void;
  getTrackData: (id: string) => TrackDataState | undefined;
}

export type DataStoreInstance = ReturnType<typeof createDataStoreInternal>;

/**
 * @deprecated Use createDataStoreMemo instead
 */
export const createDataStore = createDataStoreInternal;

/**
 * Create a memoized data store to hold data.
 * @param deps - The dependencies to track for memoization (typically not required)
 * @returns The created store
 */
export function createDataStoreMemo(deps?: React.DependencyList) {
  return useMemo(() => createDataStoreInternal(), deps ?? []);
}

function createDataStoreInternal() {
  return create<DataStore>((set, get) => ({
    trackData: new Map<string, TrackDataState>(),
    isFetching: false,
    setTrackData: (id: string, state: TrackDataState) =>
      set((store) => {
        const newMap = new Map(store.trackData);
        newMap.set(id, state);
        return { trackData: newMap };
      }),
    setMultipleTrackData: (updates: Array<{ id: string; state: TrackDataState }>) =>
      set((store) => {
        const newMap = new Map(store.trackData);
        updates.forEach(({ id, state }) => {
          newMap.set(id, state);
        });
        return { trackData: newMap };
      }),
    setFetching: (isFetching: boolean) => set({ isFetching }),
    reset: () => set({ trackData: new Map(), isFetching: false }),
    getTrackData: (id: string) => get().trackData.get(id),
  }));
}
