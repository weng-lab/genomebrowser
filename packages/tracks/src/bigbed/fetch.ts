import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import {
  bed3Schema,
  createBigBedFile,
  type BigBedFileOptions,
  type BigBedRecord,
} from "@weng-lab/genomic-reader";
import type { z } from "zod";
import { readCachedBigBedRows } from "../shared/cachedFiles";
import type { BigBedConfig, BigBedData } from "./types";

export async function fetchBigBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return readCachedBigBedRows(resources, config.url, bed3Schema, region);
}

export async function fetchBigBedRows<Schema extends z.ZodObject>({
  url,
  region,
  schema,
}: {
  url: string;
  region: GenomicRegion;
  schema: BigBedFileOptions<Schema>["schema"];
}): Promise<BigBedRecord<Schema>[]> {
  const file = createBigBedFile({ url, schema });
  return file.read(region);
}
