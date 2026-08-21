import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { bed3Schema } from "@weng-lab/genomic-reader";
import { fetchBigBedRows } from "../bigbed/fetch";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  track: { config },
  demand: { region },
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) =>
      (await fetchBigBedRows({ url: dataset.url, region, schema: bed3Schema })).map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      })),
    ),
  );
}
