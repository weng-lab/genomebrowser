import { ApolloError } from "@apollo/client";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { BigResponse, TranscriptResponse, MotifResponse, LDResponse, MotifRect } from "./apiTypes";
import { ImportanceTrackSequence } from "../components/tracks/importance/types";

export interface QueryResults {
  bigData?: BigResponse;
  geneData?: TranscriptResponse;
  motifData?: MotifResponse;
  importanceData?: BigResponse;
  bulkBedData?: BigResponse;
  snpData?: LDResponse;
  bigError?: ApolloError;
  geneError?: ApolloError;
  motifError?: ApolloError;
  importanceError?: ApolloError;
  bulkBedError?: ApolloError;
  snpError?: ApolloError;
  methylCData?: BigResponse;
  methylCError?: ApolloError;
  ldData?: LDResponse;
  ldError?: ApolloError;
}

export interface ProcessedResult {
  trackId: string;
  data: unknown;
  error?: ApolloError;
}

/**
 * Process BigWig/BigBed results
 */
function processBigWigResults(
  tracks: Track[],
  bigData: BigResponse | undefined,
  bigError: ApolloError | undefined
): ProcessedResult[] {
  const bigTracks = tracks.filter(
    (track) => track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed
  );

  return bigTracks.map((track, index) => ({
    trackId: track.id,
    data: bigError ? null : bigData?.bigRequests?.[index]?.data || null,
    error: bigError,
  }));
}

/**
 * Process transcript results
 */
function processTranscriptResults(
  tracks: Track[],
  geneData: TranscriptResponse | undefined,
  geneError: ApolloError | undefined
): ProcessedResult[] {
  const transcriptTracks = tracks.filter((track) => track.trackType === TrackType.Transcript);

  return transcriptTracks.map((track) => ({
    trackId: track.id,
    data: geneError ? null : geneData?.gene || null,
    error: geneError,
  }));
}

/**
 * Process motif results
 */
function processMotifResults(
  tracks: Track[],
  motifData: MotifResponse | undefined,
  motifError: ApolloError | undefined
): ProcessedResult[] {
  const motifTracks = tracks.filter((track) => track.trackType === TrackType.Motif);

  if (motifTracks.length === 0) return [];

  const processedData = motifError
    ? null
    : {
        occurrenceRect:
          motifData?.meme_occurrences?.map(
            (occurrence: { genomic_region: { start: number; end: number }; motif: { pwm: unknown } }) =>
              ({
                start: occurrence.genomic_region.start,
                end: occurrence.genomic_region.end,
                pwm: occurrence.motif.pwm,
              }) as MotifRect
          ) || [],
        peaks:
          motifData?.peaks?.peaks?.map(
            (peak: { chrom_start: number; chrom_end: number }) =>
              ({
                start: peak.chrom_start,
                end: peak.chrom_end,
              }) as MotifRect
          ) || [],
      };

  return motifTracks.map((track) => ({
    trackId: track.id,
    data: processedData,
    error: motifError,
  }));
}

/**
 * Process importance results
 */
function processImportanceResults(
  tracks: Track[],
  importanceData: BigResponse | undefined,
  importanceError: ApolloError | undefined
): ProcessedResult[] {
  const importanceTracks = tracks.filter((track) => track.trackType === TrackType.Importance);

  if (importanceTracks.length === 0) return [];

  const processedData = importanceError
    ? null
    : ({
        sequence: importanceData?.bigRequests?.[0]?.data?.[0] as string,
        importance: importanceData?.bigRequests?.[1]?.data?.map((d: { value: number }) => d.value) || [],
      } as ImportanceTrackSequence);

  return importanceTracks.map((track) => ({
    trackId: track.id,
    data: processedData,
    error: importanceError,
  }));
}

/**
 * Process BulkBed results
 */
function processBulkBedResults(
  tracks: Track[],
  bulkBedData: BigResponse | undefined,
  bulkBedError: ApolloError | undefined
): ProcessedResult[] {
  const bulkBedTracks = tracks.filter((track) => track.trackType === TrackType.BulkBed);

  if (bulkBedTracks.length === 0) return [];

  let responseIndex = 0;
  return bulkBedTracks.map((track) => {
    const datasets =
      (track as any).datasets?.map((dataset: any, i: number) => ({
        name: `Dataset ${i + 1}`,
        url: dataset.url,
      })) || [];

    const datasetCount = datasets.length;
    const trackData = bulkBedError
      ? null
      : bulkBedData?.bigRequests?.slice(responseIndex, responseIndex + datasetCount)?.map((response, index) => {
          const rects = response?.data || [];
          // Add datasetName to each rect
          return rects.map((rect: any) => ({
            ...rect,
            datasetName: datasets[index].name,
          }));
        }) || [];

    responseIndex += datasetCount;

    return {
      trackId: track.id,
      data: trackData,
      error: bulkBedError,
    };
  });
}

function processMethylCResults(
  tracks: Track[],
  methylCData: BigResponse | undefined,
  methylCError: ApolloError | undefined
): ProcessedResult[] {
  const methylCTracks = tracks.filter((track) => track.trackType === TrackType.MethylC);
  if (methylCTracks.length === 0) return [];

  return methylCTracks.map((track, index) => {
    const trackData = methylCError
      ? null
      : methylCData?.bigRequests?.slice(index * 8, index * 8 + 8)?.map((response) => response?.data) || [];
    return {
      trackId: track.id,
      data: trackData,
      error: methylCError,
    };
  });
}

/**
 * Process LD track results
 */
function processLDResults(
  tracks: Track[],
  snpData: LDResponse | undefined,
  snpError: ApolloError | undefined
): ProcessedResult[] {
  const ldTracks = tracks.filter((track) => track.trackType === TrackType.LDTrack);

  if (ldTracks.length === 0) return [];

  return ldTracks.map((track) => ({
    trackId: track.id,
    data: snpData?.getSNPsforGWASStudies,
    error: snpError,
  }));

  // const processedData = snpError
  //   ? null
  //   : {
  //       snps:
  //         snpData?.snpQuery
  //           ?.filter((x: { coordinates: unknown }) => x.coordinates)
  //           .map((x: { coordinates: unknown }) => ({ ...x, domain: x.coordinates })) || [],
  //       ld: [],
  //     };

  // return ldTracks.map((track) => ({
  //   trackId: track.id,
  //   data: processedData,
  //   error: snpError,
  // }));
}

/**
 * Process all query results and return organized data for each track
 */
export function processAllResults(tracks: Track[], results: QueryResults): ProcessedResult[] {
  const processedResults: ProcessedResult[] = [];

  // Process each track type
  processedResults.push(...processBigWigResults(tracks, results.bigData, results.bigError));
  processedResults.push(...processTranscriptResults(tracks, results.geneData, results.geneError));
  processedResults.push(...processMotifResults(tracks, results.motifData, results.motifError));
  processedResults.push(...processImportanceResults(tracks, results.importanceData, results.importanceError));
  processedResults.push(...processBulkBedResults(tracks, results.bulkBedData, results.bulkBedError));
  // processedResults.push(...processLDResults(tracks, results.snpData, results.snpError));
  processedResults.push(...processMethylCResults(tracks, results.methylCData, results.methylCError));
  processedResults.push(...processLDResults(tracks, results.ldData, results.ldError));
  return processedResults;
}
