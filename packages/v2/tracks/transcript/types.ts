import type { TrackConfigBase, TrackInteractionConfig } from "../../src/modules/types";

export type TranscriptDisplay = "squish" | "pack";

export interface TranscriptConfig
  extends
    Omit<TrackConfigBase, keyof TrackInteractionConfig<any, any>>,
    TrackInteractionConfig<Transcript, TranscriptConfig> {
  type: "transcript";
  display: TranscriptDisplay;
  assembly: string;
  version: number;
  geneName?: string;
  canonicalColor?: string;
  highlightColor?: string;
}

export type TranscriptData = TranscriptList[];

export type TranscriptList = {
  transcripts: Transcript[];
  strand: string;
  name?: string;
  id?: string;
};

export type Transcript = {
  id: string;
  name: string;
  coordinates: { start: number; end: number };
  strand: string;
  exons?: Exon[];
  color?: string;
  tag?: string;
};

export type Exon = {
  coordinates: { start: number; end: number };
  UTRs?: GenomicElement[];
};

export type GenomicElement = {
  coordinates: { start: number; end: number };
};

export type RenderedTranscript = {
  transcript: Transcript;
  paths: {
    introns: string;
    exons: string;
  };
};

export type TranscriptRow = {
  y: number;
  transcripts: RenderedTranscript[];
};

export type TranscriptInput = {
  id: string;
  title: string;
  assembly: string;
  version: number;
  geneName?: string;
  canonicalColor?: string;
  highlightColor?: string;
  display?: TranscriptDisplay;
  height?: number;
  color?: string;
} & Partial<TrackInteractionConfig<Transcript, TranscriptConfig>>;
