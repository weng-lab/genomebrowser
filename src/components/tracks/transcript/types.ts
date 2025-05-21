import { BaseConfig, TrackDimensions, TrackType } from "../types";

export interface TranscriptConfig extends BaseConfig {
  trackType: TrackType.Transcript;
  refetch: () => void;
  assembly: string;
  version: number;
  height: number;
  tooltip?: React.FC<Transcript>;
}

export interface SquishTranscriptProps {
  id: string;
  data: TranscriptList[];
  dimensions: TrackDimensions;
  geneName: string;
  height: number;
  color: string;
  onClick?: (transcript: Transcript) => void;
  onHover?: (transcript: Transcript) => void;
  onLeave?: () => void;
  tooltip?: React.FC<Transcript>;
}

export interface PackTranscriptProps {
  id: string;
  height: number;
  dimensions: TrackDimensions;
  data: TranscriptList[];
  color: string;
  onClick?: (transcript: Transcript) => void;
  onHover?: (transcript: Transcript) => void;
  onLeave?: () => void;
  tooltip?: React.FC<Transcript>;
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
