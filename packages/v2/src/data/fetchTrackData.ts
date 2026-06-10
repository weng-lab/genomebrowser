import type { createModuleRegistry } from "../modules/registry";
import type { TrackConfigBase } from "../modules/types";
import type { BrowserRegion } from "../utils/region";
import type { DataResult } from "./types";

type ModuleRegistry = ReturnType<typeof createModuleRegistry>;

export async function fetchTrackData({
  registry,
  track,
  region,
}: {
  registry: ModuleRegistry;
  track: TrackConfigBase;
  region: BrowserRegion;
}): Promise<DataResult> {
  try {
    const module = registry.get(track.type);
    const config = module.validate(track);
    const data = await module.fetch({ config, region });
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
