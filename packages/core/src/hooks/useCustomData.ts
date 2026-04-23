import { useEffect } from "react";
import { DataStoreInstance } from "../store/dataStore";

type CustomDataError = {
  message: string;
};

/**
 * Hook to inject custom data into the data store
 * This allows using external data sources instead of the default fetching
 */
export default function useCustomData(
  trackId: string,
  response: {
    data: any;
    error: CustomDataError | undefined;
    loading: boolean;
  },
  dataStore: DataStoreInstance
) {
  const setTrackData = dataStore((state) => state.setTrackData);
  const isFetching = dataStore((state) => state.isFetching);

  useEffect(() => {
    // Don't override if the system is currently fetching
    if (isFetching) return;

    if (response.loading) {
      setTrackData(trackId, { data: null, error: null });
    } else if (response.error) {
      setTrackData(trackId, { data: null, error: response.error.message });
    } else if (response.data) {
      setTrackData(trackId, { data: response.data, error: null });
    }
  }, [response.data, response.loading, response.error, isFetching, trackId, setTrackData]);
}
