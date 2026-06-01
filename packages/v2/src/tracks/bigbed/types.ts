import type { TrackConfigBase } from "../../modules/types";

export type BigBedDisplay = "dense" | "squish";

export type BigBedConfig = TrackConfigBase & {
  type: "bigbed";
  display: BigBedDisplay;
  url: string;
};

export type BigBedData = BigBedRow[];

export type BigBedRow = {
  chr?: string;
  chrom?: string;
  start: number;
  end: number;
  name?: string;
  score?: number | string;
  color?: string;
  rest?: string[] | string;
};

export type RenderedBigBedRect = {
  row: BigBedRow;
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number | string;
};

export type BigBedInput = {
  id: string;
  title: string;
  url: string;
  display?: BigBedDisplay;
  height?: number;
  color?: string;
};
