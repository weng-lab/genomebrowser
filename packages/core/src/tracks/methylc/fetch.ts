import type { TrackFetchContext } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import { fetchBigWigRaw } from "../bigwig/fetch";
import type { BigWigData } from "../bigwig/types";
import type { MethylCConfig, MethylCData } from "./types";

export async function fetchMethylC({
  config,
  region,
}: TrackFetchContext<MethylCConfig>): Promise<MethylCData> {
  return Promise.all([
    fetchMethylCChannel(config.urls.plusStrand.cpg.url, region),
    fetchMethylCChannel(config.urls.plusStrand.chg.url, region),
    fetchMethylCChannel(config.urls.plusStrand.chh.url, region),
    fetchMethylCChannel(config.urls.plusStrand.depth.url, region),
    fetchMethylCChannel(config.urls.minusStrand.cpg.url, region),
    fetchMethylCChannel(config.urls.minusStrand.chg.url, region),
    fetchMethylCChannel(config.urls.minusStrand.chh.url, region),
    fetchMethylCChannel(config.urls.minusStrand.depth.url, region),
  ]);
}

async function fetchMethylCChannel(url: string, region: GenomicRegion): Promise<BigWigData[]> {
  if (!url) return [];
  return fetchBigWigRaw({ url, region });
}
