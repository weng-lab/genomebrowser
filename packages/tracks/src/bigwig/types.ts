import type { TrackInteraction } from "@weng-lab/genomebrowser";

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
export type BigWigInteraction = TrackInteraction<RenderedBigWigPoint, BigWigConfig>;
export type RenderedBigWigPoint = { x: number; min: number | null; max: number | null };
export type BigWigData = { chr: string; start: number; end: number; value: number };
