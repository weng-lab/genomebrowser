import { createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import type { CcreBigBedRow } from "@weng-lab/genomebrowser-tracks/ccre";
import type { TrackSelectInteractionResolver } from "@weng-lab/genomebrowser-ui";
import { defaultAssembly } from "./assembly";
import { createInitialSnapshot } from "../sessions/initialSnapshot";
import type { SessionSnapshot } from "../sessions/types";

const ccreInteraction = { onClick: (item: CcreBigBedRow) => console.log("cCRE BigBed row", item) };
export const resolveTrackInteraction: TrackSelectInteractionResolver = ({ qualifiedTrackId }) =>
  qualifiedTrackId === "human-biosamples::ccre-aggregate" ? ccreInteraction : undefined;

export function createBrowserStores(
  snapshot: SessionSnapshot = createInitialSnapshot(defaultAssembly),
) {
  const useBrowserStore = createBrowserStore(snapshot.browser);
  const useTrackStore = createTrackStore({
    modules: firstPartyTrackModules,
    pinnedTrackIds: snapshot.trackStore.pinnedTrackIds,
    tracks: snapshot.trackStore.tracks.map((track) => ({
      ...track,
      ...(track.base.id === "human-biosamples::ccre-aggregate"
        ? { interaction: ccreInteraction }
        : {}),
    })),
  });
  return { useBrowserStore, useTrackStore };
}
