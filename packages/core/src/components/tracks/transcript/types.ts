import { Config, TrackDimensions, TrackType } from "../types";

export type TranscriptRefetch = (options: {
  variables: {
    assembly: string;
    chromosome?: string;
    start?: number;
    end?: number;
    version: number;
  };
}) => Promise<unknown>;

export interface TranscriptConfig extends Config<Transcript> {
  trackType: TrackType.Transcript;
  assembly: string;
  version: number;
  refetch?: TranscriptRefetch;
  geneName?: string;
  canonicalColor?: string; // colors in transcript with MANE_Select tag
  highlightColor?: string; // colors in transcript with name ~= geneName
}

interface TranscriptProps {
  id: string;
  data: TranscriptList[];
  dimensions: TrackDimensions;
  height: number;
  color: string;
  canonicalColor?: string;
  highlightColor?: string;
  onClick?: (transcript: Transcript) => void;
  onHover?: (transcript: Transcript) => void;
  onLeave?: (transcript: Transcript) => void;
  tooltip?: React.FC<Transcript>;
  geneName: string;
}
export type SquishTranscriptProps = TranscriptProps;

export type PackTranscriptProps = TranscriptProps;

export interface Transcript {
  id: string;
  name: string;
  coordinates: { start: number; end: number };
  strand: string;
  exons?: Exon[];
  color?: string;
  tag?: string;
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
