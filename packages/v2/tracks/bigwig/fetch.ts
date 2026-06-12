import axios from "axios/dist/axios.js";
import { AxiosDataLoader, BigWigReader, FileType } from "genomic-reader";
import type { TrackFetchContext } from "../../src/modules/types";
import type { BigWigConfig, BigWigData } from "./types";

export async function fetchBigWig({
  config,
  region,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigData[]> {
  await ensureBrowserBuffer();

  const dataLoader = new AxiosDataLoader(config.url, axios.create() as never);
  const reader = new BigWigReader(dataLoader);
  const header = await reader.getHeader();

  if (header.fileType !== FileType.BigWig) {
    throw new Error("BigWig module only supports BigWig files");
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
