import axios from "axios/dist/axios.js";
import { AxiosDataLoader, BigWigReader, FileType } from "genomic-reader";
import type { TrackFetchContext } from "../../modules/types";
import { applyFillWithZero, condenseBigWigData, getBigWigRange } from "./helpers";
import type { BigWigConfig, BigWigData, BigWigDatum } from "./types";

export async function fetchBigWig({
  config,
  region,
  width,
}: TrackFetchContext<BigWigConfig>): Promise<BigWigData> {
  await ensureBrowserBuffer();

  const dataLoader = new AxiosDataLoader(config.url, axios.create() as never);
  const reader = new BigWigReader(dataLoader);
  const header = await reader.getHeader();

  if (header.fileType !== FileType.BigWig) {
    throw new Error("BigWig module only supports BigWig files");
  }

  const rawData = (await reader.readBigWigData(
    region.chromosome,
    region.start,
    region.chromosome,
    region.end,
  )) as BigWigDatum[];

  const points = condenseBigWigData(rawData, region, width);
  if (config.fillWithZero) applyFillWithZero(points);

  return {
    points,
    range: getBigWigRange(points),
  };
}

async function ensureBrowserBuffer() {
  if (typeof window === "undefined" || typeof globalThis.Buffer !== "undefined") return;
  const { Buffer } = await import("buffer");
  globalThis.Buffer = Buffer;
}
