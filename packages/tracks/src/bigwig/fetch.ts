import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import { readCachedBigWigValues } from "../shared/cachedFiles";
import type { BigWigConfig } from "./types";

export async function fetchBigWig({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigValueRecord[]> {
  return readCachedBigWigValues(resources, config.url, region);
}
