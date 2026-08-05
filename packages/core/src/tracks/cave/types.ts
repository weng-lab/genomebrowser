import type { TrackInteraction } from "../../modules/types";
import type { BigWigData, RenderedBigWigPoint } from "../bigwig/types";

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

export type CaveInput = {
  id: string;
  title: string;
  display?: CaveDisplay;
  height?: number;
  color?: string;
  config: Omit<CaveConfig, "topColor" | "bottomColor"> & {
    topColor?: string;
    bottomColor?: string;
  };
};

export type CaveInteraction = TrackInteraction<CaveTooltipItem, CaveConfig>;

export type CaveData = {
  top: BigWigData[];
  bottom: BigWigData[];
};

export type CaveTooltipItem = {
  x: number;
  top?: RenderedBigWigPoint;
  bottom?: RenderedBigWigPoint;
};
