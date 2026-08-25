import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readCachedBigWigRecords } from "../shared/cachedFiles";
import type { BigWigConfig, BigWigData } from "./types";

export async function fetchBigWig({
  track: { config },
  demand: { region, width },
  resources,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigData> {
  return readCachedBigWigRecords(resources, config.url, region, width);
}
