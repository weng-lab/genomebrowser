import { gql } from "@apollo/client";
import { Domain } from "../utils/types";
import { Track } from "../store/trackStore";
import { BigWigConfig } from "../components/tracks/bigwig/types";

export interface BigRequest {
  url: string;
  chr1: string;
  start: number;
  end: number;
}

export function buildBigRequests(tracks: Track[], domain: Domain): BigRequest[] {
  const result = tracks.map((track) => {
    return {
      url: (track as BigWigConfig).url || "",
      chr1: domain.chromosome,
      start: domain.start,
      end: domain.end,
    };
  });
  return result;
}

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
