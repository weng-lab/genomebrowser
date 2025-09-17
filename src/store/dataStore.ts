import { ApolloError } from "@apollo/client";
import { create } from "zustand";

export interface DataStore {
  data: Map<string, any>;
  loading: boolean;
  fetching: boolean;
  setDataById: (id: string, data: any, error: ApolloError | undefined) => void;
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
}

export type DataStoreInstance = ReturnType<typeof createDataStore>;

export function createDataStore() {
  return create<DataStore>((set) => ({
    data: new Map<string, { data: any; error: ApolloError | undefined }>(),
    loading: true,
    fetching: false,
    setDataById: (id: string, data: any, error: ApolloError | undefined) =>
      set((state) => ({ data: state.data.set(id, { data, error }) })),
    setLoading: (loading: boolean) => set({ loading }),
    setFetching: (fetching: boolean) => set({ fetching }),
  }));
}

// Legacy export for backward compatibility
export const useDataStore = createDataStore();
