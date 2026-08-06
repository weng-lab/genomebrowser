import type { StoreApi, UseBoundStore } from "zustand";

export type DataResult = { status: "success"; data: unknown } | { status: "error"; error: string };

export type DataState = { status: "loading" } | DataResult;

export type DataStore = {
  data: Record<string, DataResult>;
  fetchingTrackIds: ReadonlySet<string>;
  setData: (data: Record<string, DataResult>) => void;
  setFetchingTrackIds: (trackIds: ReadonlySet<string>) => void;
  setTrackData: (trackId: string, state: DataResult) => void;
  clearTrack: (trackId: string) => void;
  clearAll: () => void;
};

export type DataStoreInstance = UseBoundStore<StoreApi<DataStore>>;
