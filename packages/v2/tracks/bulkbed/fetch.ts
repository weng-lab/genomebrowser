import type { TrackFetchContext } from "../../src/modules/types";
import { fetchBigBed } from "../bigbed/fetch";
import type { BigBedConfig } from "../bigbed/types";
import type { BulkBedConfig, BulkBedData } from "./types";

export async function fetchBulkBed({
  config,
  region,
}: TrackFetchContext<BulkBedConfig>): Promise<BulkBedData> {
  return Promise.all(
    config.datasets.map(async (dataset, index) => {
      const rows = await fetchBigBed({
        config: createBigBedConfig(config, dataset.url, dataset.name, index),
        region,
      });

      return rows.map((row) => ({
        ...row,
        datasetName: dataset.name || `Dataset ${index + 1}`,
      }));
    }),
  );
}

function createBigBedConfig(
  config: BulkBedConfig,
  url: string,
  title: string,
  index: number,
): BigBedConfig {
  return {
    id: `${config.id}-${index}`,
    type: "bigbed",
    title,
    display: "dense",
    height: config.height,
    color: config.color,
    url,
  };
}
