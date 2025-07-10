import { ApolloError } from "@apollo/client";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { BigResponse, GeneResponse, MotifResponse, LDResponse, MotifRect } from "./apiTypes";
import { ImportanceTrackSequence } from "../components/tracks/importance/types";
import { BulkBedConfig } from "../components/tracks/bulkbed/types";

export interface QueryResults {
  bigData?: BigResponse;
  geneData?: GeneResponse;
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
  if (!bigData) return [];
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
  geneData: GeneResponse | undefined,
  geneError: ApolloError | undefined
): ProcessedResult[] {
  if (!geneData) return [];
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
  if (!motifData) return [];
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
              } as MotifRect)
          ) || [],
        peaks:
          motifData?.peaks?.peaks?.map(
            (peak: { chrom_start: number; chrom_end: number }) =>
              ({
                start: peak.chrom_start,
                end: peak.chrom_end,
              } as MotifRect)
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
  if (!importanceData) return [];
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
  if (!bulkBedData) return [];
  const bulkBedTracks = tracks.filter((track): track is BulkBedConfig => track.trackType === TrackType.BulkBed);

  if (bulkBedTracks.length === 0) return [];

  let responseIndex = 0;
  return bulkBedTracks.map((track) => {
    // Handle both new datasets format and legacy urls format
    const datasets =
      track.datasets ||
      (track.urls || []).map((url, i) => ({
        name: `Dataset ${i + 1}`,
        url,
      }));

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

/**
 * Process LD track results
 */
function processLDResults(
  tracks: Track[],
  snpData: LDResponse | undefined,
  snpError: ApolloError | undefined
): ProcessedResult[] {
  if (!snpData) return [];
  const ldTracks = tracks.filter((track) => track.trackType === TrackType.LDTrack);

  if (ldTracks.length === 0) return [];

  const processedData = snpError
    ? null
    : {
        snps:
          snpData?.snpQuery
            ?.filter((x: { coordinates: unknown }) => x.coordinates)
            .map((x: { coordinates: unknown }) => ({ ...x, domain: x.coordinates })) || [],
        ld: [],
      };

  return ldTracks.map((track) => ({
    trackId: track.id,
    data: processedData,
    error: snpError,
  }));
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
  processedResults.push(...processLDResults(tracks, results.snpData, results.snpError));

  return processedResults;
}
