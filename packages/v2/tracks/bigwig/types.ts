import type { TrackConfigBase, TrackInteractionConfig } from "../../src/modules/types";

export type BigWigDisplay = "full" | "dense";

export interface BigWigConfig
  extends
    Omit<TrackConfigBase, keyof TrackInteractionConfig<any, any>>,
    TrackInteractionConfig<RenderedBigWigPoint, BigWigConfig> {
  type: "bigwig";
  display: BigWigDisplay;
  url: string;
  fillWithZero?: boolean;
  yRange?: YRange;
}

export type BigWigInput = {
  id: string;
  title: string;
  url: string;
  display?: BigWigDisplay;
  height?: number;
  color?: string;
  fillWithZero?: boolean;
  yRange?: YRange;
} & Partial<TrackInteractionConfig<RenderedBigWigPoint, BigWigConfig>>;

export type YRange = {
  min: number;
  max: number;
};

export type RenderedBigWigPoint = {
  x: number;
  min: number | null;
  max: number | null;
};

export type BigWigData = {
  chr: string;
  start: number;
  end: number;
  value: number;
};
