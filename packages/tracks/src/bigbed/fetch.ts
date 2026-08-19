import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import { bed3Schema, createBigBedFile } from "@weng-lab/genomic-reader";
import type { BigBedConfig, BigBedData, BigBedRow } from "./types";

export async function fetchBigBed({
  config,
  region,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return fetchBigBedRows({ url: config.url, region });
}

export async function fetchBigBedRows({
  url,
  region,
}: {
  url: string;
  region: GenomicRegion;
}): Promise<BigBedRow[]> {
  const file = createBigBedFile({ url, schema: bed3Schema });
  return file.read(region);
}
