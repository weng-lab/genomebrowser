import { create } from "zustand";
import type { DataResult, DataState, DataStore, DataStoreInstance } from "./types";

const loadingDataState: DataState = { status: "loading" };

export function createDataStore(): DataStoreInstance {
  return create<DataStore>((set) => ({
    data: {},
    fetchingTrackIds: new Set(),
    setData: (data) => set({ data }),
    setFetchingTrackIds: (fetchingTrackIds) => set({ fetchingTrackIds }),
    setTrackData: (trackId, state) =>
      set((store) => ({ data: { ...store.data, [trackId]: state } })),
    clearTrack: (trackId) =>
      set((store) => {
        const data = { ...store.data };
        const fetchingTrackIds = new Set(store.fetchingTrackIds);
        delete data[trackId];
        fetchingTrackIds.delete(trackId);
        return { data, fetchingTrackIds };
      }),
    clearAll: () => set({ data: {}, fetchingTrackIds: new Set() }),
  }));
}

export function getTrackDataState(result: DataResult | undefined, isFetching: boolean): DataState {
  if (isFetching) return result?.status === "success" ? result : loadingDataState;
  return result ?? loadingDataState;
}

export type { DataStore, DataStoreInstance } from "./types";
