import { bed3Schema, createBigBedFile } from "@weng-lab/genomic-reader";
import type { TrackFetchContext } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import type { BigBedConfig, BigBedData, BigBedRow } from "./types";

export async function fetchBigBed({
  config,
  region,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return fetchBigBedRows({
    url: config.url,
    region,
  });
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
