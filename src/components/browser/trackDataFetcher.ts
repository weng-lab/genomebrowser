import { Result } from "../../api/types";
import { useDataStore } from "../../store/dataStore";
import { useEffect, useState } from "react";
import { useBrowserStore } from "../../store/browserStore";
import { TrackType, useTrackStore } from "../../store/trackStore";
import { buildBigRequests, BIGDATA_QUERY } from "../../api/bigRequests";
import { useLazyQuery } from "@apollo/client";
import { Domain } from "../../utils/types";

export default function TrackDataFetcher() {
  const [result, setResult] = useState<Result>({ bigResult: { data: undefined, error: undefined }, loading: true });
  const domain = useBrowserStore((state) => state.domain);
  const tracks = useTrackStore((state) => state.tracks);
  const setData = useDataStore((state) => state.setData);
  const setFetching = useDataStore((state) => state.setFetching);
  const getIndexByType = useTrackStore((state) => state.getIndexByType);
  const setDelta = useBrowserStore((state) => state.setDelta);
  const [fetch, bigResult] = useLazyQuery(BIGDATA_QUERY);

  useEffect(() => {
    const bigTracks = tracks.filter((track) => track.trackType === TrackType.BigWig);
    const visibleWidth = domain.end - domain.start;
    const expandedDomain: Domain = {
      chromosome: domain.chromosome,
      start: domain.start - visibleWidth,
      end: domain.end + visibleWidth,
    };
    const bigRequests = buildBigRequests(bigTracks, expandedDomain);
    fetch({ variables: { bigRequests } });
    setFetching(true);
  }, [domain, tracks, fetch]);

  useEffect(() => {
    if (bigResult.loading || bigResult.data === undefined) return;
    setResult({ bigResult: { data: bigResult.data.bigRequests, error: bigResult.error }, loading: bigResult.loading });
  }, [bigResult]);

  useEffect(() => {
    if (result.loading) return;
    setDelta(0);
    setData(result, tracks, getIndexByType);
  }, [result]);

  return null;
}
