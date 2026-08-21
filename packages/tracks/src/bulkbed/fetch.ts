import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { bed3Schema } from "@weng-lab/genomic-reader";
import { readCachedBigBedRows } from "../shared/cachedFiles";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) =>
      (await readCachedBigBedRows(resources, dataset.url, bed3Schema, region)).map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      })),
    ),
  );
}
