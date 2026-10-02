import type { BigWigConfig } from "./schema";
import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { BigWigRecord } from "@weng-lab/genomic-reader";
import type { SignalPoint } from "../shared/signal";

export type BigWigData = BigWigRecord[];
export type YRange = { min: number; max: number };

export type BigWigInteraction = TrackInteraction<SignalPoint, BigWigConfig>;
