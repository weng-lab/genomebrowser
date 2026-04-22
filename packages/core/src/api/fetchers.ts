import { ApolloClient } from "@apollo/client";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { Domain } from "../utils/types";
import { BulkBedConfig } from "../components/tracks/bulkbed/types";
import { MethylCConfig } from "../components/tracks/methylC/types";
import { ImportanceConfig } from "../components/tracks/importance/types";
import { MotifRect, MotifConfig } from "../components/tracks/motif/types";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { BigBedConfig, BigBedParser, BigBedSchema } from "../components/tracks/bigbed/types";
import { createBigBedSchemaParser } from "../components/tracks/bigbed/schema";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { LDTrackConfig } from "../components/tracks/ldtrack/types";
import { ManhattanTrackConfig } from "../components/tracks/manhattan/types";
import { CustomTrackConfig } from "../components/tracks/custom/types";
import { TrackDataState } from "../store/dataStore";
import { getBigData, applyFillWithZero } from "./getBigWigData";
import { MOTIF_QUERY, TRANSCRIPT_GENES_QUERY } from "./queries";

// An interface for storing avaliable Apollo GQL Queries
export interface QueryHooks {
  client: ApolloClient<object>;
  getTrackData: (id: string) => TrackDataState | undefined;
}

// Context for the fetch function
export type FetcherContext<T extends Track = Track> = {
  track: T;
  domain: Domain;
  expandedDomain: Domain;
  preRenderedWidth: number;
  queries: QueryHooks;
};

// Fetch Function signature
export type FetchFunction = (ctx: FetcherContext) => Promise<TrackDataState>;

/**
 * Fetch a BigBed/BigWig URL using the fetcher context.
 * Useful for custom track fetchers that need to load .bb/.bw files.
 */
export async function fetchBigBedUrl(url: string, ctx: FetcherContext, parser?: BigBedParser): Promise<TrackDataState> {
  return await getBigData(url, ctx.expandedDomain, ctx.preRenderedWidth, parser);
}

/**
 * Fetch BigWig data
 */
async function fetchBigWig(ctx: FetcherContext<BigWigConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth } = ctx;
  const result = await getBigData(track.url, expandedDomain, preRenderedWidth);
  if (track.fillWithZero) applyFillWithZero(result.data);
  return result;
}

/**
 * Fetch BigBed data
 */
async function fetchBigBed(ctx: FetcherContext<BigBedConfig<any>>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth } = ctx;
  const parser = track.schema ? createBigBedSchemaParser(track.schema as BigBedSchema) : undefined;
  return await getBigData(track.url, expandedDomain, preRenderedWidth, parser);
}

/**
 * Fetch Transcript data
 */
async function fetchTranscript(ctx: FetcherContext<TranscriptConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, queries } = ctx;

  const result = await queries.client.query({
    query: TRANSCRIPT_GENES_QUERY,
    fetchPolicy: "network-only",
    variables: {
      chromosome: expandedDomain.chromosome,
      assembly: track.assembly,
      start: expandedDomain.start,
      end: expandedDomain.end,
      version: track.version,
    },
  });

  return {
    data: result.data?.gene ?? null,
    error: result.error?.message ?? null,
  };
}

/**
 * Fetch Motif data
 */
async function fetchMotif(ctx: FetcherContext<MotifConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, queries } = ctx;

  const result = await queries.client.query({
    query: MOTIF_QUERY,
    fetchPolicy: "network-only",
    variables: {
      range: {
        chromosome: expandedDomain.chromosome,
        start: expandedDomain.start,
        end: expandedDomain.end,
      },
      prange: {
        chrom: expandedDomain.chromosome,
        chrom_start: expandedDomain.start,
        chrom_end: expandedDomain.end,
      },
      assembly: track.assembly,
      consensus_regex: track.consensusRegex,
      peaks_accession: track.peaksAccession,
    },
  });

  const motifData = result.data;
  return {
    data: motifData
      ? {
          occurrenceRect:
            motifData?.meme_occurrences?.map(
              (occurrence: any) =>
                ({
                  start: occurrence.genomic_region.start,
                  end: occurrence.genomic_region.end,
                  pwm: occurrence.motif.pwm,
                }) as MotifRect
            ) ?? [],
          peaks:
            motifData?.peaks?.peaks?.map(
              (peak: any) =>
                ({
                  start: peak.chrom_start,
                  end: peak.chrom_end,
                }) as MotifRect
            ) ?? [],
        }
      : null,
    error: result.error?.message ?? null,
  };
}

/**
 * Fetch Importance data
 */
async function fetchImportance(ctx: FetcherContext<ImportanceConfig>): Promise<TrackDataState> {
  const { track, domain } = ctx;

  const results = await Promise.all([getBigData(track.url, domain, -1), getBigData(track.signalURL, domain, -1)]);

  const sequence = results[0].data[0];
  const importance = results[1]?.data?.map((d: { value: number }) => d.value) ?? [];

  const error = results[0]?.error || results[1]?.error ? results[0]?.error + "\n" + results[1]?.error : null;

  // console.log(importance);
  return { data: { sequence, importance }, error };
}

/**
 * Fetch BulkBed data
 */
async function fetchBulkBed(ctx: FetcherContext<BulkBedConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth } = ctx;

  const datasets = track.datasets || [];

  const results = await Promise.all(
    datasets.map((dataset) => getBigData(dataset.url, expandedDomain, preRenderedWidth))
  );

  return {
    data:
      results.map((response: any, index: number) => {
        const rects = response?.data ?? [];
        return rects.map((rect: any) => ({
          ...rect,
          datasetName: datasets[index]?.name || `Dataset ${index + 1}`,
        }));
      }) ?? null,
    error: results.find((r) => r.error !== null)?.error ?? null,
  };
}

/**
 * Fetch MethylC data
 */
async function fetchMethylC(ctx: FetcherContext<MethylCConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth } = ctx;

  const fetch = (url: string) => (url ? getBigData(url, expandedDomain, preRenderedWidth) : { data: [], error: null });

  const result = await Promise.all([
    fetch(track.urls.plusStrand.cpg.url),
    fetch(track.urls.plusStrand.chg.url),
    fetch(track.urls.plusStrand.chh.url),
    fetch(track.urls.plusStrand.depth.url),
    fetch(track.urls.minusStrand.cpg.url),
    fetch(track.urls.minusStrand.chg.url),
    fetch(track.urls.minusStrand.chh.url),
    fetch(track.urls.minusStrand.depth.url),
  ]);

  const data = result.map((r) => r.data);
  const error = result.map((r) => r.error);
  return {
    data: data,
    error: error.find((e) => e !== null) ?? null,
  };
}

/**
 * Fetch LDTrack data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchLDTrack(ctx: FetcherContext<LDTrackConfig>): Promise<TrackDataState> {
  // Preserve existing custom data if it exists
  const existingData = ctx.queries.getTrackData?.(ctx.track.id);

  if (existingData?.data) {
    return existingData;
  }

  // Returns empty state - useCustomData will populate this
  return {
    data: null,
    error: null,
  };
}

/**
 * Fetch Manhattan plot data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchManhattan(ctx: FetcherContext<ManhattanTrackConfig>): Promise<TrackDataState> {
  // Preserve existing custom data if it exists
  const existingData = ctx.queries.getTrackData?.(ctx.track.id);

  if (existingData?.data) {
    return existingData;
  }

  // Returns empty state - useCustomData will populate this
  return {
    data: null,
    error: null,
  };
}

/**
 * Fetch Custom track data using the user-provided fetcher
 */
async function fetchCustom(ctx: FetcherContext<CustomTrackConfig>): Promise<TrackDataState> {
  return await ctx.track.fetcher(ctx);
}

/**
 * Registry of fetcher functions by track type
 */
export const trackFetchers: Record<TrackType, FetchFunction> = {
  [TrackType.BigWig]: fetchBigWig as FetchFunction,
  [TrackType.BigBed]: fetchBigBed as FetchFunction,
  [TrackType.Transcript]: fetchTranscript as FetchFunction,
  [TrackType.Motif]: fetchMotif as FetchFunction,
  [TrackType.Importance]: fetchImportance as FetchFunction,
  [TrackType.BulkBed]: fetchBulkBed as FetchFunction,
  [TrackType.MethylC]: fetchMethylC as FetchFunction,
  [TrackType.LDTrack]: fetchLDTrack as FetchFunction,
  [TrackType.Manhattan]: fetchManhattan as FetchFunction,
  [TrackType.Custom]: fetchCustom as FetchFunction,
};
