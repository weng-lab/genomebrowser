import type { TrackInteraction } from "@weng-lab/genomebrowser";

export type BigBedDisplay = "dense" | "squish";
export type BigBedConfig = { url: string };
export type BigBedData = BigBedRow[];
export type BigBedRow = {
  chromosome: string;
  start: number;
  end: number;
  fields: string[];
  name?: string;
  score?: number | string;
  strand?: string;
  color?: string;
  [key: string]: unknown;
};
export type RenderedBigBedRect<Row extends BigBedRow = BigBedRow> = {
  row: Row;
  start: number;
  end: number;
  color?: string;
  name?: string;
  score?: number | string;
};
export type BigBedInteraction = TrackInteraction<BigBedRow, BigBedConfig>;
