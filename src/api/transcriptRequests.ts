import { ApolloError } from "@apollo/client";
import { Track } from "../store/trackStore";
import { Domain } from "../utils/types";

export function buildTranscriptRequests(tracks: Track[], domain: Domain) {
  return [];
}

export function fetchTranscriptData(requests: any[]): { data: any; loading: boolean; error: ApolloError | undefined } {
  return { data: [], loading: false, error: undefined };
}
