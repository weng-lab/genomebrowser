import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readBedPreset } from "../shared/readBedPreset";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) =>
      (await readBedPreset(resources, dataset.url, config.bedSchema, region)).map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      })),
    ),
  );
}
