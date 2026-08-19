import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchBigWigRaw } from "../bigwig/fetch";
import type { BigWigData } from "../bigwig/types";
import type { MethylCConfig, MethylCData } from "./types";
export async function fetchMethylC({
  config,
  region,
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
    ].map((url) => fetchChannel(url, region)),
  );
}
async function fetchChannel(url: string, region: GenomicRegion): Promise<BigWigData[]> {
  return url ? fetchBigWigRaw({ url, region }) : [];
}
