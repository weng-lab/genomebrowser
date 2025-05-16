import { BaseConfig, TrackType } from "../types";

export interface TranscriptConfig extends BaseConfig {
  trackType: TrackType.Transcript;
  refetch: () => void;
  assembly: string;
  version: number;
  rowHeight: number;
}

export interface Transcript {
  id: string;
  name: string;
  coordinates: { start: number; end: number };
  strand: string;
  exons?: Exon[];
  color?: string;
}

export interface TranscriptList {
  transcripts: Transcript[];
  strand: string;
  name?: string;
  id?: string;
}

export type TranscriptRow = {
  y: number;
  transcripts: RenderedTranscript[];
};

export type RenderedTranscript = {
  transcript: Transcript;
  paths: ExonPaths;
};

export interface Exon {
  coordinates: { start: number; end: number };
  UTRs?: GenomicElement[];
}

export interface GenomicElement {
  coordinates: { start: number; end: number };
}

export type ExonPaths = {
  introns: string;
  exons: string;
};
