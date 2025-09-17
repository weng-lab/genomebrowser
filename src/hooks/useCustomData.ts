import { useEffect } from "react";
import { DataStoreInstance } from "../store/dataStore";
import { ApolloError } from "@apollo/client";

export default function useCustomData(
  trackId: string,
  response: {
    data: any;
    error: ApolloError | undefined;
    loading: boolean;
  },
  dataStore: DataStoreInstance
) {
  const setDataById = dataStore((state) => state.setDataById);
  const fetching = dataStore((state) => state.fetching);
  const globalLoading = dataStore((state) => state.loading);

  useEffect(() => {
    if (response.data && !response.loading && !response.error && !fetching && !globalLoading) {
      setDataById(trackId, response.data, response.error);
    }
  }, [response.data, response.loading, response.error, fetching, trackId, globalLoading]);
}
