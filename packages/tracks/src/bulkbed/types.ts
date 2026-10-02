import type { BulkBedConfig } from "./schema";
import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigBedRow } from "../bigbed/types";

export type BulkBedRect = BigBedRow & { datasetName?: string };

export type BulkBedData = BulkBedRect[][];
export type BulkBedInteraction = TrackInteraction<BulkBedRect, BulkBedConfig>;
