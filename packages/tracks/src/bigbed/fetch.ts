import type { GenomicRegion, TrackFetchContext, TrackResources } from "@weng-lab/genomebrowser";
import type { BigBedFileOptions, BigBedRecord } from "@weng-lab/genomic-reader";
import type { z } from "zod";
import { readCachedBigBedRows } from "../shared/cachedFiles";
import { readBedPreset } from "../shared/readBedPreset";
import type { BigBedConfig, BigBedData } from "./types";

export async function fetchBigBed({
  track: { config },
  demand: { region },
  resources,
  signal,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return readBedPreset(resources, config.url, config.bedSchema, region, signal);
}

/** Reads custom BigBed columns, reusing a reader per URL and schema identity in resources. */
export async function fetchBigBedRows<Schema extends z.ZodObject>({
  url,
  region,
  schema,
  resources,
  signal,
}: {
  url: string;
  region: GenomicRegion;
  schema: BigBedFileOptions<Schema>["schema"];
  resources: TrackResources;
  signal?: AbortSignal;
}): Promise<BigBedRecord<Schema>[]> {
  return readCachedBigBedRows(resources, url, schema, region, signal);
}
