import { Track } from "../store/trackStore";
import { Domain } from "../utils/types";
import { gql } from "@apollo/client";

export const BIGDATA_QUERY = gql`
  query BigRequests($bigRequests: [BigRequest!]!) {
    bigRequests(requests: $bigRequests) {
      data
      error {
        errortype
        message
      }
    }
  }
`;

interface BigRequest {
  url: string;
  chr1: string;
  start: number;
  end: number;
}

export function buildBigRequests(tracks: Track[], domain: Domain): BigRequest[] {
  const result = tracks.map((track) => {
    return {
      url: track.url || "",
      chr1: domain.chromosome,
      start: domain.start,
      end: domain.end,
    };
  });
  return result;
}
