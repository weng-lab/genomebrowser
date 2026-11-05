import {
  createBrowserStore,
  createTrackStore,
  type BrowserStore,
  type GenomeBrowserStores,
  type TrackStore,
} from "@weng-lab/genomebrowser";
import { firstPartyTrackModules } from "@weng-lab/genomebrowser-tracks";
import { shallow } from "zustand/vanilla/shallow";
import { getAssembly } from "../assemblies/assemblies";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";

// Capture and observation select the same persisted inputs. Keep references here
// so checking a runtime-only store change does not serialize the snapshot.
function browserValues(browser: BrowserStore): SessionSnapshot["browser"] {
  return {
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
  };
}

function trackValues({ tracks, pinnedTrackIds }: TrackStore) {
  return { tracks, pinnedTrackIds };
}

/** Serializable browser and track state, as saved and as returned to agents. */
export function snapshot(session: GenomeBrowserStores): SessionSnapshot {
  const tracks = trackValues(session.useTrackStore.getState());
  const values = {
    version: 1,
    browser: browserValues(session.useBrowserStore.getState()),
    tracks: tracks.tracks.map(({ type, base, config, source }) => ({ type, base, config, source })),
    pinnedTrackIds: tracks.pinnedTrackIds,
  };
  // Optional settings can be explicitly cleared to undefined. JSON omits those
  // keys, matching the payload sent to storage and the module defaults on restore.
  return sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(values)));
}

/**
 * Notify synchronously when persisted inputs may have changed, including invalid
 * edits. Registration is silent; the caller captures and validates the snapshot.
 * Store actions replace changed values, so inputs are compared by reference.
 * Call the returned function when the session stops saving.
 */
export function observeSnapshot(session: GenomeBrowserStores, changed: () => void) {
  const stopBrowser = session.useBrowserStore.subscribe((next, previous) => {
    if (!shallow(browserValues(next), browserValues(previous))) changed();
  });
  const stopTracks = session.useTrackStore.subscribe((next, previous) => {
    if (!shallow(trackValues(next), trackValues(previous))) changed();
  });
  return () => {
    stopBrowser();
    stopTracks();
  };
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
