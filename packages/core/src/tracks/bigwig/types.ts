import type { TrackInteraction } from "../../modules/types";

export type BigWigDisplay = "full" | "dense";

export type BigWigConfig = {
  url: string;
  fillWithZero?: boolean;
  /** Optional minimum and maximum overrides for the automatically calculated Y-axis range. */
  yRange?: YRangeOverride;
  showClampIndicators?: boolean;
  clampIndicatorColor?: string;
};

export type BigWigInput = {
  id: string;
  title: string;
  display?: BigWigDisplay;
  height?: number;
  color?: string;
  config: BigWigConfig;
};

export type BigWigInteraction = TrackInteraction<RenderedBigWigPoint, BigWigConfig>;

export type YRange = {
  min: number;
  max: number;
};

/** Independent overrides applied to an automatically calculated BigWig Y-axis range. */
export type YRangeOverride = {
  min?: number;
  max?: number;
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
