import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readBedPreset } from "../shared/readBedPreset";
import type { BulkBedData } from "./types";
import type { BulkBedConfig } from "./schema";

export async function fetchBulkBed({
  track: { config },
  demand: { region },
  resources,
  signal,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) =>
      (await readBedPreset(resources, dataset.url, config.bedSchema, region, signal)).map(
        (row) => ({
          ...row,
          datasetName: dataset.name || `Dataset ${index + 1}`,
        }),
      ),
    ),
  );
}
