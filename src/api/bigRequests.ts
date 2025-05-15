import { gql } from "@apollo/client";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { Domain } from "../utils/types";

export interface BigRequest {
  url: string;
  chr1: string;
  start: number;
  end: number;
}

export function buildBigRequests(tracks: BigWigConfig[] | BigBedConfig[], domain: Domain): BigRequest[] {
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
