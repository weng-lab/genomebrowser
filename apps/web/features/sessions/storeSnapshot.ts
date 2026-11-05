import {
  createBrowserStore,
  createTrackStore,
  type GenomeBrowserStores,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { getAssembly } from "../assemblies/assemblies";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";

/** Serializable browser and track state, as saved and as returned to agents. */
export function snapshot(session: GenomeBrowserStores): SessionSnapshot {
  const browser = session.useBrowserStore.getState();
  const tracks = session.useTrackStore.getState();
  const values = {
    version: 1,
    browser: {
      assembly: browser.assembly.id,
      region: browser.region,
      basePairDetail: browser.basePairDetail,
      marginWidth: browser.marginWidth,
      trackWidth: browser.trackWidth,
      fontSize: browser.fontSize,
      titleSize: browser.titleSize,
      highlights: browser.highlights,
      selectionMode: browser.selectionMode,
      selectionHighlight: browser.selectionHighlight,
    },
    tracks: tracks.tracks.map(({ type, base, config, source }) => ({ type, base, config, source })),
    pinnedTrackIds: tracks.pinnedTrackIds,
  };
  // Optional settings can be explicitly cleared to undefined. JSON omits those
  // keys, matching the payload sent to storage and the module defaults on restore.
  return sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(values)));
}

/** Restore a saved snapshot into its final stores. Neither is exposed until both validate. */
export function restoreSnapshot(saved: SessionSnapshot): GenomeBrowserStores {
  const assembly = getAssembly(saved.browser.assembly);
  if (!assembly) throw new Error(`Unsupported assembly ${saved.browser.assembly}`);
  const useBrowserStore = createBrowserStore({ ...saved.browser, assembly });
  const useTrackStore = createTrackStore({
    modules: firstPartyTrackModules,
    tracks: saved.tracks,
    pinnedTrackIds: saved.pinnedTrackIds,
  });
  return { useBrowserStore, useTrackStore };
}
