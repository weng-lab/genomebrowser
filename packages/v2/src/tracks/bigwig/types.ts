import type { TrackConfigBase } from "../../modules/types";

export type BigWigDisplay = "full" | "dense";

export type BigWigConfig = TrackConfigBase & {
  type: "bigwig";
  display: BigWigDisplay;
  url: string;
  fillWithZero?: boolean;
  yRange?: YRange;
};

export type BigWigInput = {
  id: string;
  title: string;
  url: string;
  display?: BigWigDisplay;
  height?: number;
  color?: string;
  fillWithZero?: boolean;
  yRange?: YRange;
};

export type YRange = {
  min: number;
  max: number;
};

export type ValuedPoint = {
  x: number;
  min: number | null;
  max: number | null;
};

export type BigWigDatum = {
  chr: string;
  start: number;
  end: number;
  value: number;
};

export type BigWigData = {
  points: ValuedPoint[];
  range: YRange;
};
