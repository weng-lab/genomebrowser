import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { fetchBigBedRows } from "../bigbed/fetch";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  config,
  region,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) =>
      (await fetchBigBedRows({ url: dataset.url, region })).map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      })),
    ),
  );
}
