import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BamRecord, TwoBitRecord } from "@weng-lab/genomic-reader";
import type { BamConfig } from "./schema";

export type BamDisplay = "dense" | "squish" | "pack" | "full";
export type BamData = {
  records: BamRecord[];
  reference: TwoBitRecord[];
  message?: string;
  referenceError?: string;
};
export type BamInteraction = TrackInteraction<BamRecord, BamConfig>;
export type { BamConfig, BamConfigInput } from "./schema";
export type { BamRecord } from "@weng-lab/genomic-reader";
