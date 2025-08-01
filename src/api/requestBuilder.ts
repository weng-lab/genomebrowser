import { Domain } from "../utils/types";
import { Track } from "../store/trackStore";
import { TrackType } from "../components/tracks/types";
import { BigRequest, TranscriptRequest, MotifRequest, LDRequest } from "./apiTypes";
import { BulkBedConfig } from "../components/tracks/bulkbed/types";

export interface AllRequests {
  bigRequests: BigRequest[];
  transcriptRequest?: TranscriptRequest;
  motifRequest?: MotifRequest;
  importanceRequests: BigRequest[];
  bulkBedRequests: BigRequest[];
  ldRequest?: LDRequest;
}

/**
 * Build BigWig/BigBed requests for given tracks
 */
export function buildBigRequests(tracks: Track[], domain: Domain): BigRequest[] {
  return tracks
    .filter((track) => track.trackType === TrackType.BigWig || track.trackType === TrackType.BigBed)
    .map((track) => ({
      url: track.url || "",
      chr1: domain.chromosome,
      start: domain.start,
      end: domain.end,
    }));
}

/**
 * Build BulkBed requests for given tracks
 */
export function buildBulkBedRequests(tracks: Track[], domain: Domain): BigRequest[] {
  return tracks
    .filter((track): track is BulkBedConfig => track.trackType === TrackType.BulkBed)
    .flatMap((track) => {
      const datasets = track.datasets.map((dataset, i) => ({
        name: `Dataset ${i + 1}`,
        url: dataset.url,
      }));

      return datasets.map((dataset) => ({
        url: dataset.url,
        chr1: domain.chromosome,
        start: domain.start,
        end: domain.end,
      }));
    });
}

/**
 * Build transcript request for given tracks (first transcript track found)
 */
export function buildTranscriptRequest(tracks: Track[], domain: Domain): TranscriptRequest | undefined {
  const transcriptTrack = tracks.find((track) => track.trackType === TrackType.Transcript);
  if (!transcriptTrack) return undefined;

  return {
    chromosome: domain.chromosome,
    assembly: transcriptTrack.assembly,
    start: domain.start,
    end: domain.end,
    version: transcriptTrack.version,
  };
}

/**
 * Build motif request for given tracks (first motif track found)
 */
export function buildMotifRequest(tracks: Track[], domain: Domain): MotifRequest | undefined {
  const motifTrack = tracks.find((track) => track.trackType === TrackType.Motif);
  if (!motifTrack) return undefined;

  return {
    range: {
      chromosome: domain.chromosome,
      start: domain.start,
      end: domain.end,
    },
    prange: {
      chrom: domain.chromosome,
      chrom_start: domain.start,
      chrom_end: domain.end,
    },
    assembly: motifTrack.assembly,
    consensus_regex: motifTrack.consensusRegex,
    peaks_accession: motifTrack.peaksAccession,
  };
}

/**
 * Build importance requests for given tracks (first importance track found)
 * Use currentDomain to get only the viewable region (avoids large requests)
 */
export function buildImportanceRequests(tracks: Track[], currentDomain: Domain): BigRequest[] {
  const importanceTrack = tracks.find((track) => track.trackType === TrackType.Importance);
  if (!importanceTrack) return [];

  return [
    {
      url: importanceTrack.url || "",
      chr1: currentDomain.chromosome,
      start: currentDomain.start,
      end: currentDomain.end,
    },
    {
      url: importanceTrack.signalURL,
      chr1: currentDomain.chromosome,
      start: currentDomain.start,
      end: currentDomain.end,
    },
  ];
}

/**
 * Build LD request for given tracks (first LD track found)
 */
export function buildLDRequest(tracks: Track[], domain: Domain): LDRequest | undefined {
  const ldTrack = tracks.find((track) => track.trackType === TrackType.LDTrack);
  if (!ldTrack) return undefined;

  return {
    assembly: ldTrack.assembly,
    coordinates: {
      chromosome: domain.chromosome,
      start: domain.start,
      end: domain.end,
    },
  };
}

/**
 * Build all requests for all track types in one coordinated call
 */
export function buildAllRequests(tracks: Track[], expandedDomain: Domain, currentDomain: Domain): AllRequests {
  return {
    bigRequests: buildBigRequests(tracks, expandedDomain),
    transcriptRequest: buildTranscriptRequest(tracks, expandedDomain),
    motifRequest: buildMotifRequest(tracks, expandedDomain),
    importanceRequests: buildImportanceRequests(tracks, currentDomain),
    bulkBedRequests: buildBulkBedRequests(tracks, expandedDomain),
    ldRequest: buildLDRequest(tracks, expandedDomain),
  };
}
