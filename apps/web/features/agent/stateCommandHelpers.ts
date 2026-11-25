import { normalizeAssemblyRegion } from "../assemblies/regions";
import { planTrackMetadataChange } from "../browser/trackMetadataCore";
import { sortTrackList } from "../browser/trackSortCore";
import type { StateCommandHelpers } from "./commands/define";

/**
 * Shared domain helpers for state agent commands, used identically on the server
 * (`stateCommands.ts`) and in the browser tab (`RemoteControlProvider.tsx`).
 */
export function createStateCommandHelpers(): StateCommandHelpers {
  return {
    normalizeRegion: normalizeAssemblyRegion,
    sortTracks: sortTrackList,
    planTrackMetadata: planTrackMetadataChange,
  };
}
