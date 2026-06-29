import type { TrackInteraction } from "../../modules/types";
import type { BigBedRow } from "../bigbed/types";

export type BulkBedDisplay = "full";

export type BulkBedDataset = {
  name: string;
  url: string;
};

export type BulkBedRect = BigBedRow & {
  datasetName?: string;
};

export type BulkBedConfig = {
  datasets: BulkBedDataset[];
  gap?: number;
};

export type BulkBedData = BulkBedRect[][];

export type BulkBedInput = {
  id: string;
  title: string;
  datasets: BulkBedDataset[];
  gap?: number;
  display?: BulkBedDisplay;
  height?: number;
  color?: string;
} & Partial<TrackInteraction<BulkBedRect>>;
