import type { TrackFetchContext } from "@weng-lab/genomebrowser";
import { readBedPreset } from "../shared/readBedPreset";
import type { BigBedConfig, BigBedData } from "./types";

export async function fetchBigBed({
  track: { config },
  demand: { region },
  resources,
}: TrackFetchContext<BigBedConfig>): Promise<BigBedData> {
  return readBedPreset(resources, config.url, config.bedSchema, region);
}
