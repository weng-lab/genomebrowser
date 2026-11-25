import {
  createBrowserStore,
  createTrackStore,
  type AnyTrackInstance,
} from "@weng-lab/genomebrowser";
import { normalizeGroups, type SessionStores } from "../browser/regions/regionGroups";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";
import { deepEqual, isDerivedHeightTrack, sameTrackForSync, syncedBrowserKeys } from "./syncSchema";

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

/**
 * Apply a remote snapshot onto live stores while preserving object identity for
 * every unchanged field and track (so TrackDataController and track rows do not
 * refetch or re-render unnecessarily) and keeping local renderer-derived track
 * heights on unchanged tracks so tabs at different widths do not ping-pong.
 * Every store's next state is built and validated before any store changes, so
 * a snapshot that fails validation leaves the stores as they were.
 */
export function applyRemoteSnapshot(session: SessionStores, saved: SessionSnapshot) {
  const currentBrowser = session.useBrowserStore.getState();
  if (saved.browser.assembly !== currentBrowser.assembly.id) {
    throw new Error(
      `Cannot apply a ${saved.browser.assembly} session into ${currentBrowser.assembly.id}`,
    );
  }

  // 1) Browser store: patch only fields whose values changed (order-insensitively).
  const normalizedRegion = createBrowserStore({
    assembly: currentBrowser.assembly,
    region: saved.browser.region,
  }).getState().region;
  const browserUpdates: Record<string, unknown> = {};
  let browserChanged = false;

  for (const key of syncedBrowserKeys) {
    const incoming = key === "region" ? normalizedRegion : saved.browser[key];
    if (!deepEqual(currentBrowser[key], incoming)) {
      browserUpdates[key] = incoming;
      browserChanged = true;
    }
  }

  // 2) Region groups: patch only when normalized groups differ.
  const nextGroups = normalizeGroups(
    saved.regionGroups,
    saved.browser.highlights.map((highlight) => highlight.id),
  );
  const groupsChanged = !deepEqual(session.useRegionGroupStore.getState().groups, nextGroups);

  // 3) Track store: reuse existing track object references whenever unchanged.
  const currentTracksState = session.useTrackStore.getState();
  const existingById = new Map(
    currentTracksState.tracks.map((track) => [track.base.id, track] as const),
  );
  const resolvedTracks: AnyTrackInstance[] = [];
  let tracksChanged =
    saved.tracks.length !== currentTracksState.tracks.length ||
    !deepEqual(currentTracksState.pinnedTrackIds, saved.pinnedTrackIds);

  for (let i = 0; i < saved.tracks.length; i++) {
    const incoming = saved.tracks[i];
    const existing = existingById.get(incoming.base.id);
    if (existing && sameTrackForSync(existing, incoming)) {
      resolvedTracks.push(existing);
      if (currentTracksState.tracks[i] !== existing) tracksChanged = true;
      continue;
    }
    tracksChanged = true;
    const adjusted =
      existing &&
      isDerivedHeightTrack(incoming) &&
      existing.type === incoming.type &&
      existing.base.display === incoming.base.display &&
      deepEqual(existing.config, incoming.config)
        ? { ...incoming, base: { ...incoming.base, height: existing.base.height } }
        : incoming;
    const validated = createTrackStore({
      modules: currentTracksState.registry.modules,
      tracks: [adjusted],
    }).getState().tracks[0];
    resolvedTracks.push(
      existing?.interaction !== undefined
        ? { ...validated, interaction: existing.interaction }
        : validated,
    );
  }

  // Every track is valid, so apply all three. The groups follow the highlights.
  if (browserChanged) {
    session.useBrowserStore.setState(
      browserUpdates as Partial<ReturnType<typeof session.useBrowserStore.getState>>,
    );
  }
  if (groupsChanged) session.useRegionGroupStore.setState({ groups: nextGroups });
  if (tracksChanged) {
    const ordered = orderTracksWithPins(resolvedTracks, saved.pinnedTrackIds);
    session.useTrackStore.setState({
      tracks: ordered.tracks,
      order: ordered.order,
      pinnedTrackIds: [...new Set(saved.pinnedTrackIds)],
    });
  }
}

function orderTracksWithPins(tracks: AnyTrackInstance[], pinnedTrackIds: readonly string[]) {
  const remaining = new Map(tracks.map((track) => [track.base.id, track]));
  const ordered: AnyTrackInstance[] = [];
  for (const id of pinnedTrackIds) {
    const track = remaining.get(id);
    if (track) {
      ordered.push(track);
      remaining.delete(id);
    }
  }
  ordered.push(...remaining.values());
  return { tracks: ordered, order: ordered.map((track) => track.base.id) };
}
