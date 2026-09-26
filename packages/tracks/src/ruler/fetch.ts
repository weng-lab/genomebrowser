import { readCachedTwoBitSequence } from "../shared/cachedFiles";
import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { type TwoBitRecord } from "@weng-lab/genomic-reader";

import type { RulerConfig } from "./schema";
export type RulerData = { records: TwoBitRecord[]; error?: string };

export async function fetchRuler({
  track: { config },
  demand: { region, basePairDetail },
  resources,
  signal,
}: TrackFetchContext<RulerConfig>): Promise<RulerData> {
  if (!config.sequenceUrl || !basePairDetail) return { records: [] };
  try {
    return {
      records: await readCachedTwoBitSequence(resources, config.sequenceUrl, region, signal),
    };
  } catch (error) {
    // A superseded request is not a failure to report; let the browser drop it.
    if (signal?.aborted) throw error;
    // Coordinates remain useful even when the optional sequence source fails.
    return {
      records: [],
      error: error instanceof Error ? error.message : "Sequence request failed",
    };
  }
}
