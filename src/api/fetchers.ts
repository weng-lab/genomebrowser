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

import axios from "axios";
import { AxiosDataLoader, BigWigData, BigWigReader, BigZoomData } from "bigwig-reader";
import { BigRequest } from "../api-legacy/apiTypes";
import { getBigWigData, ogBigWigFetcher } from "./getBigWigData";

export interface QueryHooks {
  fetchBigData: LazyQueryExecFunction<any, OperationVariables>;
  fetchGene: LazyQueryExecFunction<any, OperationVariables>;
  fetchMotif: LazyQueryExecFunction<any, OperationVariables>;
}

export type FetcherContext<T extends Track = Track> = {
  track: T;
  domain: Domain;
  expandedDomain: Domain;
  preRenderedWidth: number;
  queries: QueryHooks;
};

export type FetchFunction = (ctx: FetcherContext) => Promise<TrackDataState>;

/**
 * Fetch BigWig data
 */
async function fetchBigWig(ctx: FetcherContext<BigWigConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth } = ctx;
  // return await ogBigWigFetcher(ctx);
  return await getBigWigData(track.url, expandedDomain, preRenderedWidth);
}

/**
 * Fetch BigBed data
 */
async function fetchBigBed(ctx: FetcherContext<BigBedConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  const result = await queries.fetchBigData({
    variables: {
      bigRequests: [
        {
          url: track.url || "",
          chr1: expandedDomain.chromosome,
          start: expandedDomain.start,
          end: expandedDomain.end,
          zoomLevel: Math.floor((expandedDomain.end - expandedDomain.start) / preRenderedWidth),
          preRenderedWidth,
        },
      ],
    },
  });

  return {
    data: result.data?.bigRequests?.[0]?.data ?? null,
    error: result.error?.message ?? null,
  };
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

  // Use current domain (not expanded) to avoid large requests
  const result = await queries.fetchBigData({
    variables: {
      bigRequests: [
        {
          url: track.url || "",
          chr1: domain.chromosome,
          start: domain.start,
          end: domain.end,
        },
        {
          url: track.signalURL,
          chr1: domain.chromosome,
          start: domain.start,
          end: domain.end,
        },
      ],
    },
  });

  return {
    data: result.data
      ? {
          sequence: (result.data.bigRequests?.[0]?.data?.[0] as string) ?? "",
          importance: result.data.bigRequests?.[1]?.data?.map((d: { value: number }) => d.value) ?? [],
        }
      : null,
    error: result.error?.message ?? null,
  };
}

/**
 * Fetch BulkBed data
 */
async function fetchBulkBed(ctx: FetcherContext<BulkBedConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, queries } = ctx;

  const datasets = track.datasets || [];

  const result = await queries.fetchBigData({
    variables: {
      bigRequests: datasets.map((dataset) => ({
        url: dataset.url,
        chr1: expandedDomain.chromosome,
        start: expandedDomain.start,
        end: expandedDomain.end,
      })),
    },
  });

  return {
    data:
      result.data?.bigRequests?.map((response: any, index: number) => {
        const rects = response?.data ?? [];
        return rects.map((rect: any) => ({
          ...rect,
          datasetName: datasets[index]?.name || `Dataset ${index + 1}`,
        }));
      }) ?? null,
    error: result.error?.message ?? null,
  };
}

/**
 * Fetch MethylC data
 */
async function fetchMethylC(ctx: FetcherContext<MethylCConfig>): Promise<TrackDataState> {
  const { track, expandedDomain, preRenderedWidth, queries } = ctx;

  const result = await Promise.all([
    getBigWigData(track.urls.plusStrand.cpg.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.plusStrand.chg.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.plusStrand.chh.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.plusStrand.depth.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.minusStrand.cpg.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.minusStrand.chg.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.minusStrand.chh.url, expandedDomain, preRenderedWidth),
    getBigWigData(track.urls.minusStrand.depth.url, expandedDomain, preRenderedWidth),
  ]);

  const data = result.map((r) => r.data);
  const error = result.map((r) => r.error);
  return {
    data: data,
    error: error.find((e) => e !== null) ?? null,
  };

  // const createRequest = (url: string) => ({
  //   url,
  //   chr1: expandedDomain.chromosome,
  //   start: expandedDomain.start,
  //   end: expandedDomain.end,
  //   preRenderedWidth,
  // });

  // const result = await queries.fetchBigData({
  //   variables: {
  //     bigRequests: [
  //       createRequest(track.urls.plusStrand.cpg.url),
  //       createRequest(track.urls.plusStrand.chg.url),
  //       createRequest(track.urls.plusStrand.chh.url),
  //       createRequest(track.urls.plusStrand.depth.url),
  //       createRequest(track.urls.minusStrand.cpg.url),
  //       createRequest(track.urls.minusStrand.chg.url),
  //       createRequest(track.urls.minusStrand.chh.url),
  //       createRequest(track.urls.minusStrand.depth.url),
  //     ],
  //   },
  // });

  // return {
  //   data: result.data?.bigRequests?.map((response: any) => response?.data ?? []) ?? null,
  //   error: result.error?.message ?? null,
  // };
}

/**
 * Fetch LDTrack data
 */
async function fetchLDTrack(_ctx: FetcherContext<LDTrackConfig>): Promise<TrackDataState> {
  // TODO: Implement LD track fetching when LD_QUERY is available
  return {
    data: null,
    error: null,
  };
}

/**
 * Fetch Manhattan plot data
 */
async function fetchManhattan(_ctx: FetcherContext<ManhattanTrackConfig>): Promise<TrackDataState> {
  // TODO: Implement Manhattan plot fetching
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
