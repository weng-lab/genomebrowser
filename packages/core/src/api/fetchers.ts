import { Buffer } from "buffer";
globalThis.Buffer = Buffer;

import { LazyQueryExecFunction, OperationVariables } from "@apollo/client";
import { TrackInstance } from "../components/tracks/types";
import { Domain } from "../utils/types";
import { TrackDataState } from "../store/dataStore";
import { getBigData, applyFillWithZero, type BigBedParser } from "./getBigWigData";

export { applyFillWithZero };

// An interface for storing available Apollo GQL Queries
export interface QueryHooks {
  fetchBigData: LazyQueryExecFunction<any, OperationVariables>;
  fetchGene: LazyQueryExecFunction<any, OperationVariables>;
  fetchMotif: LazyQueryExecFunction<any, OperationVariables>;
  getTrackData: (id: string) => TrackDataState | undefined;
}

// Context for the fetch function
export type FetcherContext<T extends TrackInstance = TrackInstance> = {
  track: T;
  domain: Domain;
  expandedDomain: Domain;
  preRenderedWidth: number;
  queries: QueryHooks;
};

// Fetch Function signature
export type FetchFunction = (ctx: FetcherContext) => Promise<TrackDataState>;

/**
 * Race-based fetcher for BigWig/BigBed data.
 * Shared utility used by track definition fetchers.
 */
export async function getBigDataRace(
  url: string,
  expandedDomain: Domain,
  preRenderedWidth: number,
  _queries: QueryHooks,
  parser?: BigBedParser
) {
  const startTime = performance.now();

  const [p1] = [
    getBigData(url, expandedDomain, preRenderedWidth, parser).then((data) => {
      const elapsed = performance.now() - startTime;
      return { data, source: "New" as const, elapsed, url };
    }),
  ];

  const result = await Promise.race([p1]);
  return result.data;
}

/**
 * Fetch a BigBed/BigWig URL using the fetcher context.
 * Useful for track definition fetchers that need to load .bb/.bw files.
 */
export async function fetchBigBedUrl(url: string, ctx: FetcherContext, parser?: BigBedParser): Promise<TrackDataState> {
  return await getBigDataRace(url, ctx.expandedDomain, ctx.preRenderedWidth, ctx.queries, parser);
}
