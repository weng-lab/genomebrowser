import type { TrackFetchContext } from "../../modules/types";
import { fetchBigBedRows } from "../bigbed/fetch";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  config,
  region,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) => {
      const rows = await fetchBigBedRows({
        url: dataset.url,
        region,
      });

      return rows.map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      }));
    }),
  );
}
