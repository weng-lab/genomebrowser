import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { SignalPoint } from "../shared/signal";

export type BigWigDisplay = "full" | "dense";
export type YRange = { min: number; max: number };
export type YRangeOverride = { min?: number; max?: number };
export type BigWigConfig = {
  url: string;
  fillWithZero: boolean;
  yRange?: YRangeOverride;
  showClampIndicators: boolean;
  clampIndicatorColor: string;
};
export type BigWigInteraction = TrackInteraction<SignalPoint, BigWigConfig>;
