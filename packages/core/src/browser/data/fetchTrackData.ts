import type { AssemblyDefinition } from "../../genome/assembly";
import type { ModuleRegistry } from "../../modules/registry";
import type { AnyTrackInstance, TrackFetch } from "../../modules/types";
import type { GenomicRegion } from "../../genome/region";
import type { TrackResourceStoreInstance } from "./trackResourceStore";
import type { DataResult } from "./types";

export async function fetchTrackData({
  registry,
  resourceStore,
  track,
  region,
  width,
  assembly,
}: {
  registry: ModuleRegistry;
  resourceStore: TrackResourceStoreInstance;
  track: AnyTrackInstance;
  region: GenomicRegion;
  width: number;
  assembly: AssemblyDefinition;
}): Promise<DataResult> {
  try {
    const module = registry.get(track.type);
    const fetchTrack = module.fetch as TrackFetch<unknown, unknown>;
    const data = await fetchTrack({
      track: {
        id: track.base.id,
        type: track.type,
        display: track.base.display,
        config: track.config,
      },
      demand: { assembly, region, width },
      resources: resourceStore.resourcesFor({ type: track.type, id: track.base.id }),
    });
    return { status: "success", data };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Unknown error" };
  }
}
