import type { TrackInteraction } from "@weng-lab/genomebrowser";
import type { TwoBitRecord } from "@weng-lab/genomic-reader";
import type { BigWigData } from "../bigwig/types";
import type { SignalPoint } from "../shared/signal";
import type { z } from "zod";
import type { configSchema } from "./schema";

export type DynseqConfig = z.output<typeof configSchema>;

/** One reference base with the score the signal file gives it. */
export type DynseqPoint = {
  position: number;
  score: number;
  base: string;
};

export type DynseqData = { signal: BigWigData; sequence: TwoBitRecord[] };
export type DynseqItem = DynseqPoint | SignalPoint;
export type DynseqInteraction = TrackInteraction<DynseqItem, DynseqConfig>;
export type DynseqDisplay = "full" | "dense";
