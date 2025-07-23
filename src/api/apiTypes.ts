/**
 * All request and response types for the genome browser API
 */

// BigWig/BigBed request type
export interface BigRequest {
  url: string;
  chr1: string;
  start: number;
  end: number;
}

export interface BigResponse {
  bigRequests: { data: any }[];
}

// Transcript request type
export interface TranscriptRequest {
  chromosome: string;
  assembly: string;
  start: number;
  end: number;
  version: number;
}

export interface TranscriptResponse {
  gene: any;
}

// Motif request type
export interface MotifRequest {
  consensus_regex: string;
  peaks_accession: string;
  range: {
    chromosome: string;
    start: number;
    end: number;
  };
  assembly: string;
  prange: {
    chrom: string;
    chrom_start: number;
    chrom_end: number;
  };
}

export interface MotifResponse {
  meme_occurrences: any[];
  peaks: { peaks: any[] };
}

// LD track request type
export interface LDRequest {
  assembly: string;
  coordinates: {
    chromosome: string;
    start: number;
    end: number;
  };
}

export interface LDResponse {
  snpQuery: any[];
}

// Motif result rectangle type (used in results processing)
export interface MotifRect {
  start: number;
  end: number;
  pwm?: number[][];
}
