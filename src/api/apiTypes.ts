/**
 * All request and response types for the genome browser API
 */

// BigWig/BigBed request type
export interface BigRequest {
  url: string;
  chr1: string;
  start: number;
  end: number;
  preRenderedWidth?: number;
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
  study: string[];
}

export interface LDResponse {
  getSNPsforGWASStudies: {
    snpid: string;
    ldblock: string;
    rsquare: number;
    chromosome: string;
    stop: number;
    start: number;
    ldblocksnpid: string;
  }[];
}

// Motif result rectangle type (used in results processing)
export interface MotifRect {
  start: number;
  end: number;
  pwm?: number[][];
}

export interface MethylCRequest {
  plusStrand: {
    cpgPlus: BigRequest;
    chgPlus: BigRequest;
    chhPlus: BigRequest;
    depthPlus: BigRequest;
  };
  minusStrand: {
    cpgMinus: BigRequest;
    chgMinus: BigRequest;
    chhMinus: BigRequest;
    depthMinus: BigRequest;
  };
}

export interface MethylCResponse {
  bigRequests: { data: any }[];
}
