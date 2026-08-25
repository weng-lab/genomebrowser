import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigWigRecord } from "@weng-lab/genomic-reader";
import type { SignalPoint } from "../shared/signal";
import type { YRange } from "../bigwig/types";
export type MethylCDisplay = "split";
export type MethylCColors = { cpg: string; chg: string; chh: string; depth: string };
export type MethylCStrandUrls = {
  cpg: { url: string };
  chg: { url: string };
  chh: { url: string };
  depth: { url: string };
};
export type MethylCUrls = { plusStrand: MethylCStrandUrls; minusStrand: MethylCStrandUrls };
export type MethylCData = BigWigRecord[][];
export type MethylCShowRows = {
  fwdCpg: boolean;
  fwdChg: boolean;
  fwdChh: boolean;
  fwdDepth: boolean;
  revCpg: boolean;
  revChg: boolean;
  revChh: boolean;
  revDepth: boolean;
};
export type MethylCTooltipItem = {
  tooltipValues: SignalPoint[];
  showRows: MethylCShowRows;
};
export type MethylCConfig = {
  colors: MethylCColors;
  urls: MethylCUrls;
  maskCpgByCoverage: boolean;
  range?: YRange;
};
export type MethylCInteraction = TrackInteraction<MethylCTooltipItem, MethylCConfig>;
