import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigBedRow } from "../bigbed/types";
import type { RowLayoutConfig } from "../shared/layout";
export type BulkBedDisplay = "full";
export type BulkBedDataset = { name: string; url: string };
export type BulkBedRect = BigBedRow & { datasetName?: string };
export type BulkBedConfig = RowLayoutConfig & { datasets: BulkBedDataset[]; gap?: number };
export type BulkBedData = BulkBedRect[][];
export type BulkBedInteraction = TrackInteraction<BulkBedRect, BulkBedConfig>;
