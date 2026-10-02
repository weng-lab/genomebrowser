import type { MethylCConfig } from "./schema";
import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigWigRecord } from "@weng-lab/genomic-reader";
import type { SignalPoint } from "../shared/signal";

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

export type MethylCInteraction = TrackInteraction<MethylCTooltipItem, MethylCConfig>;
