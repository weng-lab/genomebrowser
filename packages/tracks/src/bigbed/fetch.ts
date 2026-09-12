import type { GenomicRegion, TrackFetchContext } from "@weng-lab/genomebrowser";
import {
  createBigBedFile,
  type BigBedFileOptions,
  type BigBedRecord,
} from "@weng-lab/genomic-reader";
import type { z } from "zod";
import { readBedPreset } from "../shared/readBedPreset";
import type { BigBedConfig, BigBedData } from "./types";

export async function fetchBigBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return readBedPreset(resources, config.url, config.bedSchema, region);
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
