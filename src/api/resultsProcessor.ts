import { ApolloError } from "@apollo/client";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { MotifRect } from "./apiTypes";
import { ImportanceTrackSequence } from "../components/tracks/importance/types";

export interface QueryResults {
  bigData?: unknown;
  geneData?: unknown;
  motifData?: unknown;
  importanceData?: unknown;
  snpData?: unknown;
  bigError?: ApolloError;
  geneError?: ApolloError;
  motifError?: ApolloError;
  importanceError?: ApolloError;
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
function processBigWigResults(tracks: Track[], bigData: unknown, bigError: ApolloError | undefined): ProcessedResult[] {
  const bigTracks = tracks.filter(
    (track) => track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed
  );

  return bigTracks.map((track, index) => ({
    trackId: track.id,
    data: bigError ? null : (bigData?.bigRequests?.[index]?.data || null),
    error: bigError,
  }));
}

/**
 * Process transcript results
 */
function processTranscriptResults(tracks: Track[], geneData: unknown, geneError: ApolloError | undefined): ProcessedResult[] {
  const transcriptTracks = tracks.filter((track) => track.trackType === TrackType.Transcript);

  return transcriptTracks.map((track) => ({
    trackId: track.id,
    data: geneError ? null : (geneData?.gene || null),
    error: geneError,
  }));
}

/**
 * Process motif results
 */
function processMotifResults(tracks: Track[], motifData: unknown, motifError: ApolloError | undefined): ProcessedResult[] {
  const motifTracks = tracks.filter((track) => track.trackType === TrackType.Motif);

  if (motifTracks.length === 0) return [];

  const processedData = motifError ? null : {
    occurrenceRect: motifData?.meme_occurrences?.map((occurrence: {
      genomic_region: { start: number; end: number };
      motif: { pwm: unknown };
    }) => ({
      start: occurrence.genomic_region.start,
      end: occurrence.genomic_region.end,
      pwm: occurrence.motif.pwm,
    } as MotifRect)) || [],
    peaks: motifData?.peaks?.peaks?.map((peak: {
      chrom_start: number;
      chrom_end: number;
    }) => ({
      start: peak.chrom_start,
      end: peak.chrom_end,
    } as MotifRect)) || [],
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
function processImportanceResults(tracks: Track[], importanceData: unknown, importanceError: ApolloError | undefined): ProcessedResult[] {
  const importanceTracks = tracks.filter((track) => track.trackType === TrackType.Importance);

  if (importanceTracks.length === 0) return [];

  const processedData = importanceError ? null : {
    sequence: importanceData?.bigRequests?.[0]?.data?.[0] as string,
    importance: importanceData?.bigRequests?.[1]?.data?.map((d: { value: number }) => d.value) || [],
  } as ImportanceTrackSequence;

  return importanceTracks.map((track) => ({
    trackId: track.id,
    data: processedData,
    error: importanceError,
  }));
}

/**
 * Process LD track results
 */
function processLDResults(tracks: Track[], snpData: unknown, snpError: ApolloError | undefined): ProcessedResult[] {
  const ldTracks = tracks.filter((track) => track.trackType === TrackType.LDTrack);

  if (ldTracks.length === 0) return [];

  const processedData = snpError ? null : {
    snps: snpData?.snpQuery
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
  processedResults.push(...processLDResults(tracks, results.snpData, results.snpError));

  return processedResults;
}