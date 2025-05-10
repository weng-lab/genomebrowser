import { Result } from "../api/fetchTrackData";
import { useDataStore } from "../store/dataStore";
import { useEffect, useState } from "react";
import { useBrowserStore } from "../store/browserStore";
import { TrackType, useTrackStore } from "../store/trackStore";
import { buildBigRequests, BIGDATA_QUERY } from "../api/bigRequests";
import { useLazyQuery } from "@apollo/client";

export default function useTrackData() {
  const [result, setResult] = useState<Result>({ bigResult: { data: undefined, error: undefined }, loading: true });
  const domain = useBrowserStore((state) => state.domain);
  const tracks = useTrackStore((state) => state.tracks);
  const setData = useDataStore((state) => state.setData);
  const getIndexByType = useTrackStore((state) => state.getIndexByType);

  const [fetch, bigResult] = useLazyQuery(BIGDATA_QUERY);

  useEffect(() => {
    const bigTracks = tracks.filter((track) => track.trackType === TrackType.BigWig);
    const bigRequests = buildBigRequests(bigTracks, domain);
    fetch({ variables: { bigRequests } });
  }, [domain, tracks]);

  useEffect(() => {
    if (bigResult.loading || bigResult.data === undefined) return;
    setResult({ bigResult: { data: bigResult.data.bigRequests, error: bigResult.error }, loading: bigResult.loading });
  }, [bigResult]);

  useEffect(() => {
    if (result.loading) return;
    setData(result, tracks, getIndexByType);
  }, [result.loading]);
}
