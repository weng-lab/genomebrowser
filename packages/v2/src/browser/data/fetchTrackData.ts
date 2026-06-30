import type { ModuleRegistry } from "../../modules/registry";
import type { TrackInstance } from "../../modules/types";
import type { BrowserRegion } from "../../modules/utils/region";
import type { DataResult } from "./types";

export async function fetchTrackData({
  registry,
  track,
  region,
}: {
  registry: ModuleRegistry;
  track: TrackInstance<any, any>;
  region: BrowserRegion;
}): Promise<DataResult> {
  try {
    const module = registry.get(track.type);
    const data = await module.fetch({ config: track.config, region });
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
