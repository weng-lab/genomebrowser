import { ApolloError } from "@apollo/client";
import { create } from "zustand";
import { Result } from "../api/types";
import { Track, TrackType } from "./trackStore";

interface DataStore {
  data: Map<string, any>;
  loading: boolean;
  fetching: boolean;
  getData: (id: string) => { data: any; error: ApolloError | undefined; loading: boolean };
  setDataById: (id: string, data: any, error: ApolloError | undefined) => void;
  setData: (result: Result, tracks: Track[], getIndexByType: (id: string) => number) => void;
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
  data: new Map<string, { data: any; error: ApolloError | undefined }>(),
  loading: true,
  fetching: false,
  getData: (id: string) => {
    const state = get();
    const result = state.data.get(id);
    return { data: result?.data, error: result?.error, loading: state.loading };
  },
  setDataById: (id: string, data: any, error: ApolloError | undefined) =>
    set((state) => ({ data: state.data.set(id, { data, error }) })),
  setData: (result: Result, tracks: Track[], getIndexByType: (id: string) => number) => {
    const { bigResult } = result;

    const processTrackData = (trackId: string, resultData: any, resultError: ApolloError | undefined) => {
      const state = get();
      const index = getIndexByType(trackId);
      if (index === -1) return;
      const trackData = resultData[index];
      state.setDataById(trackId, trackData, resultError);
    };

    for (const track of tracks) {
      switch (track.trackType) {
        case TrackType.BigWig:
          if (!bigResult.data) return;
          processTrackData(track.id, bigResult.data, bigResult.error);
          break;
        default:
          break;
      }
    }
    set({ loading: false, fetching: false });
  },
  setLoading: (loading: boolean) => set({ loading }),
  setFetching: (fetching: boolean) => set({ fetching }),
}));
