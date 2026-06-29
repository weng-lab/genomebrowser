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
};

export type CaveInput = {
  id: string;
  title: string;
  neurotransmitter: CaveNeurotransmitter;
  age: CaveAge;
  display?: CaveDisplay;
  height?: number;
  color?: string;
} & Partial<TrackInteraction<CaveTooltipItem>>;

export type CaveData = {
  top: BigWigData[];
  bottom: BigWigData[];
};

export type CaveTooltipItem = {
  x: number;
  top?: RenderedBigWigPoint;
  bottom?: RenderedBigWigPoint;
};
