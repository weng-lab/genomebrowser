import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import type { BigWigValueRecord } from "@weng-lab/genomic-reader";
import { readCachedBigWigValues } from "../shared/cachedFiles";
import type { MethylCConfig, MethylCData } from "./types";

export async function fetchMethylC({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<MethylCConfig>): Promise<MethylCData> {
  const plus = config.urls.plusStrand;
  const minus = config.urls.minusStrand;
  return Promise.all(
    [
      plus.cpg.url,
      plus.chg.url,
      plus.chh.url,
      plus.depth.url,
      minus.cpg.url,
      minus.chg.url,
      minus.chh.url,
      minus.depth.url,
    ].map((url) => fetchChannel(url, region, resources)),
  );
}

async function fetchChannel(
  url: string,
  region: GenomicRegion,
  resources: TrackFetchContext<MethylCConfig>["resources"],
): Promise<BigWigValueRecord[]> {
  return url ? readCachedBigWigValues(resources, url, region) : [];
}
