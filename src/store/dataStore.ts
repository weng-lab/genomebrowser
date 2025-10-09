import { ApolloError } from "@apollo/client";
import { useMemo } from "react";
import { create } from "zustand";

export interface DataStore {
  data: Map<string, any>;
  loading: boolean;
  fetching: boolean;
  setDataById: (id: string, data: any, error: ApolloError | undefined) => void;
  setLoading: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
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
