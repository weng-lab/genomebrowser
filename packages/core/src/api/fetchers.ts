import { LazyQueryExecFunction, OperationVariables } from "@apollo/client";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { Domain } from "../utils/types";
import { BulkBedConfig } from "../components/tracks/bulkbed/types";
import { MethylCConfig } from "../components/tracks/methylC/types";
import { ImportanceConfig } from "../components/tracks/importance/types";
import { MotifRect, MotifConfig } from "../components/tracks/motif/types";
import { BigWigConfig } from "../components/tracks/bigwig/types";
import { BigBedConfig } from "../components/tracks/bigbed/types";
import { TranscriptConfig } from "../components/tracks/transcript/types";
import { LDTrackConfig } from "../components/tracks/ldtrack/types";
import { ManhattanTrackConfig } from "../components/tracks/manhattan/types";
import { TrackDataState } from "../store/dataStore";
import { ogBigDataFetcher } from "./getBigWigData";

// An interface for storing avaliable Apollo GQL Queries
export interface QueryHooks {
  fetchBigData: LazyQueryExecFunction<any, OperationVariables>;
  fetchGene: LazyQueryExecFunction<any, OperationVariables>;
  fetchMotif: LazyQueryExecFunction<any, OperationVariables>;
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
 * Fetch BigWig data
 */
async function fetchBigWig(ctx: FetcherContext<BigWigConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;
  return await ogBigDataFetcher(track.url, expandedDomain, preRenderedWidth, queries);

  // const newResult = await getBigData(track.url, expandedDomain, preRenderedWidth);
  // return newResult;
}

/**
 * Fetch BigBed data
 */
async function fetchBigBed(ctx: FetcherContext<BigBedConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  return await ogBigDataFetcher(track.url, expandedDomain, preRenderedWidth, queries);
  // const { track, expandedDomain, preRenderedWidth } = ctx;
  // return await getBigData(track.url, expandedDomain, preRenderedWidth);
}

/**
 * Fetch Transcript data
 */
async function fetchTranscript(ctx: FetcherContext<TranscriptConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, queries } = ctx;

  const result = await queries.fetchGene({
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

  const result = await queries.fetchMotif({
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
  const { track, domain, queries } = ctx;

  const results = await Promise.all([
    ogBigDataFetcher(track.url, domain, -1, queries),
    ogBigDataFetcher(track.signalURL, domain, -1, queries),
  ]);

  const sequence = results[0].data[0];
  const importance = results[1]?.data?.map((d: { value: number }) => d.value) ?? [];

  const error = results[0]?.error || results[1]?.error ? results[0]?.error + "\n" + results[1]?.error : null;

  console.log(importance);
  return { data: { sequence, importance }, error };
}

/**
 * Fetch BulkBed data
 */
async function fetchBulkBed(ctx: FetcherContext<BulkBedConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  const datasets = track.datasets || [];

  const results = await Promise.all(
    datasets.map((dataset) => ogBigDataFetcher(dataset.url, expandedDomain, preRenderedWidth, queries))
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
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  const result = await Promise.all([
    ogBigDataFetcher(track.urls.plusStrand.cpg.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.plusStrand.chg.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.plusStrand.chh.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.plusStrand.depth.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.minusStrand.cpg.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.minusStrand.chg.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.minusStrand.chh.url, expandedDomain, preRenderedWidth, queries),
    ogBigDataFetcher(track.urls.minusStrand.depth.url, expandedDomain, preRenderedWidth, queries),
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
async function fetchLDTrack(_ctx: FetcherContext<LDTrackConfig>): Promise<TrackDataState> {
  // Returns loading state as useCustomData is required for this track
  return {
    data: null,
    error: null,
  };
}

/**
 * Fetch Manhattan plot data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchManhattan(_ctx: FetcherContext<ManhattanTrackConfig>): Promise<TrackDataState> {
  // Returns loading state as useCustomData is required for this track
  return {
    data: null,
    error: null,
  };
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
};
