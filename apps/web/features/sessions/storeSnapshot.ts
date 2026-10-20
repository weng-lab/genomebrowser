import {
  createBrowserStore,
  createTrackStore,
  type GenomeBrowserStores,
} from "@weng-lab/genomebrowser";
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

export function restore(session: GenomeBrowserStores, saved: SessionSnapshot) {
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
  session.useTrackStore.setState({
    tracks: tracks.tracks,
    order: tracks.order,
    pinnedTrackIds: tracks.pinnedTrackIds,
  });
}
