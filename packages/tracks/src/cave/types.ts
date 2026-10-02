import type { CaveConfig } from "./schema";
import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigWigRecord } from "@weng-lab/genomic-reader";
import type { SignalPoint } from "../shared/signal";

export type CaveInteraction = TrackInteraction<CaveTooltipItem, CaveConfig>;
export type CaveData = { top: BigWigRecord[]; bottom: BigWigRecord[] };
export type CaveTooltipItem = {
  x: number;
  top?: SignalPoint;
  bottom?: SignalPoint;
};
