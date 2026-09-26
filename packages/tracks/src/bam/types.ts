import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BamRecord, TwoBitRecord } from "@weng-lab/genomic-reader";
import type { BamConfig } from "./schema";
import type { BamCoverageBin } from "./coverage";
import type { BamJunction } from "./junctions";

export type BamDisplay = "dense" | "squish" | "pack" | "full";
export type BamData = {
  records: BamRecord[];
  reference: TwoBitRecord[];
  message?: string;
  referenceError?: string;
};
export type BamInteraction = TrackInteraction<BamRecord, BamConfig>;
/** Hover targets across sections. Only alignments reach interaction callbacks. */
export type BamTooltipItem = BamRecord | BamCoverageBin | BamJunction;
export type { BamConfig, BamConfigInput, BamCoverageScale } from "./schema";
export type { BamCoverageBin } from "./coverage";
export type { BamJunction } from "./junctions";
export type { BamRecord } from "@weng-lab/genomic-reader";
