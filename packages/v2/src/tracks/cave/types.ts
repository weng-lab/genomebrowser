import type { TrackConfigBase, TrackInteractionConfig } from "../../modules/types";
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

export interface CaveConfig
  extends
    Omit<TrackConfigBase, keyof TrackInteractionConfig<any, any>>,
    TrackInteractionConfig<CaveTooltipItem, CaveConfig> {
  type: "cave";
  display: CaveDisplay;
  neurotransmitter: CaveNeurotransmitter;
  age: CaveAge;
}

export type CaveInput = {
  id: string;
  title: string;
  neurotransmitter: CaveNeurotransmitter;
  age: CaveAge;
  display?: CaveDisplay;
  height?: number;
  color?: string;
} & Partial<TrackInteractionConfig<CaveTooltipItem, CaveConfig>>;

export type CaveData = {
  top: BigWigData[];
  bottom: BigWigData[];
};

export type CaveTooltipItem = {
  x: number;
  top?: RenderedBigWigPoint;
  bottom?: RenderedBigWigPoint;
};
