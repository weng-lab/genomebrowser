import { create } from "zustand";
import type { DataStore, DataStoreInstance } from "./types";

export function createDataStore(): DataStoreInstance {
  return create<DataStore>((set) => ({
    clearAll: () => set({ data: {} }),
    clearTrack: (trackId) =>
      set((store) => {
        const data = { ...store.data };
        delete data[trackId];
        return { data };
      }),
    data: {},
    setData: (data) => set({ data }),
    setTrackData: (trackId, state) =>
      set((store) => ({ data: { ...store.data, [trackId]: state } })),
  }));
}

export type { DataStore, DataStoreInstance } from "./types";
