import { ApolloError } from "@apollo/client";
import { TrackType } from "../store/trackStore";
import { buildBigRequests } from "./bigRequests";
import { Domain } from "../utils/types";
import { Track } from "../store/trackStore";

export function fetchTrackData(domain: Domain, tracks: Track[]) {
  // Filter out tracks and create requests
  const bigTracks = tracks.filter((track) => track.trackType === TrackType.BigWig);
  const bigRequests = buildBigRequests(bigTracks, domain);

  // fetch data
  const bigResult = fetchBigData(bigRequests);

  // combine results
  const result: Result = {
    bigResult: {
      data: bigResult.data,
      error: bigResult.error,
    },
    loading: bigResult.loading,
  };

  return result;
}

export interface Result {
  bigResult: {
    data: any; // TODO: type this
    error: ApolloError | undefined;
  }; // add more result types here and combine the loading boolean
  loading: boolean;
}
