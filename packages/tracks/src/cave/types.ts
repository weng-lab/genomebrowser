import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import type { SignalPoint } from "../shared/signal";
export type CaveDisplay = "full";
export type CaveNeurotransmitter = "GABA" | "GLU";
export type CaveAge =
  | "Infancy"
  | "Early_Childhood"
  | "Late_Childhood"
  | "Adolescence"
  | "Early_Adulthood"
  | "Adulthood";
export type CaveConfig = {
  neurotransmitter: CaveNeurotransmitter;
  age: CaveAge;
  topColor: string;
  bottomColor: string;
};
export type CaveInteraction = TrackInteraction<CaveTooltipItem, CaveConfig>;
export type CaveData = { top: BigWigValueRecord[]; bottom: BigWigValueRecord[] };
export type CaveTooltipItem = {
  x: number;
  top?: SignalPoint;
  bottom?: SignalPoint;
};
