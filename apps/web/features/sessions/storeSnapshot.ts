import { createBrowserStore, createTrackStore } from "@weng-lab/genomebrowser";
import { normalizeGroups, type SessionStores } from "../browser/regions/regionGroups";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";

/** Serializable browser, track, and region-group state, as saved and as returned to agents. */
export function snapshot(session: SessionStores): SessionSnapshot {
  const browser = session.useBrowserStore.getState();
  const tracks = session.useTrackStore.getState();
  const { groups } = session.useRegionGroupStore.getState();
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
    tracks: tracks.tracks.map(({ type, base, config, source, metadata }) => ({
      type,
      base,
      config,
      source,
      metadata,
    })),
    pinnedTrackIds: tracks.pinnedTrackIds,
    regionGroups: groups,
  };
  // Optional settings can be explicitly cleared to undefined. JSON omits those
  // keys, matching the payload sent to storage and the module defaults on restore.
  return sessionSnapshotSchema.parse(JSON.parse(JSON.stringify(values)));
}

export function restore(session: SessionStores, saved: SessionSnapshot) {
  // Validate both stores before changing either live store. Runtime actions and
  // registered modules stay local; only serializable session values are restored.
  const { assembly } = session.useBrowserStore.getState();
  if (saved.browser.assembly !== assembly.id)
    throw new Error(`Cannot restore a ${saved.browser.assembly} session into ${assembly.id}`);
  const browser = createBrowserStore({ ...saved.browser, assembly }).getState();
  const tracks = createTrackStore({
    modules: session.useTrackStore.getState().registry.modules,
    tracks: saved.tracks,
    pinnedTrackIds: saved.pinnedTrackIds,
  }).getState();
  const { assembly: _assembly, ...values } = saved.browser;
  session.useBrowserStore.setState({ ...values, region: browser.region });
  // After the highlights, which the groups follow. Saved groups may hold stale or repeated
  // members, or none, from older sessions or the sessions API.
  session.useRegionGroupStore.setState({
    groups: normalizeGroups(
      saved.regionGroups,
      saved.browser.highlights.map((highlight) => highlight.id),
    ),
  });
  session.useTrackStore.setState({
    tracks: tracks.tracks,
    order: tracks.order,
    pinnedTrackIds: tracks.pinnedTrackIds,
  });
}
