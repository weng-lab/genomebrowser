import type { ModuleRegistry } from "../../modules/registry";
import type { AnyTrackInstance, TrackFetch } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import type { DataResult } from "./types";

export async function fetchTrackData({
  registry,
  track,
  region,
}: {
  registry: ModuleRegistry;
  track: AnyTrackInstance;
  region: BrowserRegion;
}): Promise<DataResult> {
  try {
    const module = registry.get(track.type);
    const fetchTrack = module.fetch as TrackFetch<unknown, unknown>;
    const data = await fetchTrack({ config: track.config, region });
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
