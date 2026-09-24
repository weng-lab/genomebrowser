import { createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { defaultAssembly } from "@/features/assemblies/assemblies";
import { createInitialSnapshot } from "./initialSnapshot";
import type { SessionSnapshot } from "./types";

/** Create independent browser and track stores from a snapshot, or the guest defaults. */
export function restoreStores(snapshot: SessionSnapshot = createInitialSnapshot(defaultAssembly)) {
  const useBrowserStore = createBrowserStore(snapshot.browser);
  const useTrackStore = createTrackStore({
    modules: firstPartyTrackModules,
    pinnedTrackIds: snapshot.trackStore.pinnedTrackIds,
    tracks: snapshot.trackStore.tracks,
  });
  return { useBrowserStore, useTrackStore };
}
