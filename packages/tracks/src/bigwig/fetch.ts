import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readCachedBigWigRecords } from "../shared/cachedFiles";
import type { BigWigData } from "./types";
import type { BigWigConfig } from "./schema";

export async function fetchBigWig({
  track: { config },
  demand: { region, width },
  resources,
  signal,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigData> {
  return readCachedBigWigRecords(resources, config.url, region, width, signal);
}
