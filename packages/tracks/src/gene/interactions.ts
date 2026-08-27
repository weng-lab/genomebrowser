import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type {
  CompositeGeneExonPart,
  CompositeGeneIntronRun,
  GeneExonPart,
  GeneIntronPart,
} from "./geometry";
import type { GeneConfig, GeneTranscript, GroupedGene } from "./types";

export type GeneTranscriptPart = (GeneIntronPart | GeneExonPart) & {
  source: "transcript";
};

export type MergedGenePart = (CompositeGeneIntronRun | CompositeGeneExonPart) & {
  source: "merged";
};

export type GenePart = GeneTranscriptPart | MergedGenePart;

export type GeneInteractionTarget =
  | { kind: "gene"; feature: GroupedGene }
  | { kind: "transcript"; feature: GeneTranscript }
  | { kind: "part"; feature: GeneTranscript; part: GeneTranscriptPart }
  | { kind: "part"; feature: GroupedGene; part: MergedGenePart };

export type GeneInteraction = TrackInteraction<GeneInteractionTarget, GeneConfig>;
