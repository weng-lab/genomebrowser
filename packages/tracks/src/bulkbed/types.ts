import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigBedRow } from "../bigbed/types";
export type BulkBedDisplay = "full";
export type BulkBedDataset = { name: string; url: string };
export type BulkBedRect = BigBedRow & { datasetName?: string };
export type BulkBedConfig = { datasets: BulkBedDataset[]; gap?: number };
export type BulkBedData = BulkBedRect[][];
export type BulkBedInteraction = TrackInteraction<BulkBedRect, BulkBedConfig>;
