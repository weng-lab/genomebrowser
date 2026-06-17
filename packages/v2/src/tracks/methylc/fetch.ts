import axios from "axios";
import { AxiosDataLoader, BigWigReader, FileType } from "genomic-reader";
import type { TrackFetchContext } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
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

async function fetchMethylCChannel(url: string, region: BrowserRegion): Promise<BigWigData[]> {
  if (!url) return [];

  await ensureBrowserBuffer();

  const dataLoader = new AxiosDataLoader(url, axios.create() as never);
  const reader = new BigWigReader(dataLoader);
  const header = await reader.getHeader();

  if (header.fileType !== FileType.BigWig) {
    throw new Error("MethylC module only supports BigWig files");
  }

  return (await reader.readBigWigData(
    region.chromosome,
    region.start,
    region.chromosome,
    region.end,
  )) as BigWigData[];
}

async function ensureBrowserBuffer() {
  if (typeof window === "undefined" || typeof globalThis.Buffer !== "undefined") return;
  const { Buffer } = await import("buffer");
  globalThis.Buffer = Buffer;
}
