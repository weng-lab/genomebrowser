import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { RowLayoutConfig } from "../shared/layout";

export type GeneDisplay = "full" | "merged" | "tagged";
export type GeneTagColor = {
  tag: string;
  color: string;
};
export type GeneConfig = RowLayoutConfig & {
  url: string;
  geneName?: string;
  tagColors: GeneTagColor[];
  highlightColor: string;
};
export type GeneStrand = "+" | "-";
export type BigGenePredCdsStatus = "none" | "unk" | "incmpl" | "cmpl";
export type GeneAttributeValue = string | string[];
export type GeneAttributes = Record<string, GeneAttributeValue>;

/** The complete standard BigGenePred record from which a transcript was derived. */
export type BigGenePredSource = {
  chromosome: string;
  start: number;
  end: number;
  name: string;
  score: number;
  strand: GeneStrand;
  thickStart: number;
  thickEnd: number;
  reserved: string;
  blockCount: number;
  blockSizes: number[];
  chromStarts: number[];
  name2: string;
  cdsStartStat: BigGenePredCdsStatus;
  cdsEndStat: BigGenePredCdsStatus;
  exonFrames: number[];
  type: string;
  geneName: string;
  geneName2: string;
  geneType: string;
  fields: string[];
};

/** The complete BigGenePredPlusV1 record from which a transcript was derived. */
export type BigGenePredPlusV1Source = BigGenePredSource & {
  tags: string;
  attributes: string;
};

export type GeneExon = {
  start: number;
  end: number;
  frame: -1 | 0 | 1 | 2;
};

export type GeneTranscript = {
  kind: "transcript";
  chromosome: string;
  start: number;
  end: number;
  strand: GeneStrand;
  transcriptId: string;
  transcriptName: string;
  geneId: string;
  geneName: string;
  tags: string[];
  attributes: GeneAttributes;
  exons: GeneExon[];
  source: BigGenePredSource | BigGenePredPlusV1Source;
};

export type GroupedGene = {
  kind: "gene";
  chromosome: string;
  start: number;
  end: number;
  strand: GeneStrand;
  geneId: string;
  geneName: string;
  transcripts: GeneTranscript[];
};

export type GeneFeature = GeneTranscript | GroupedGene;
export type GeneData = GeneTranscript[];
export type GeneInteraction = TrackInteraction<GeneFeature, GeneConfig>;
