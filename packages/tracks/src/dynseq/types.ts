import type { z } from "zod";
import type { configSchema } from "./schema";

export type DynseqConfig = z.output<typeof configSchema>;

/** One reference base with the score the signal file gives it. */
export type DynseqPoint = {
  position: number;
  score: number;
  base: string;
};

export type DynseqData = DynseqPoint[];
