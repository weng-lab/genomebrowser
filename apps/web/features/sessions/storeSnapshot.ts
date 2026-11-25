import {
  createBrowserStore,
  createTrackStore,
  type AnyTrackInstance,
} from "@weng-lab/genomebrowser";
import { normalizeGroups, type SessionStores } from "../browser/regions/regionGroups";
import { sessionSnapshotSchema, type SessionSnapshot } from "./snapshot.ts";
import { isDerivedHeightTrack } from "./syncSchema";

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
 */
export function applyRemoteSnapshot(session: SessionStores, saved: SessionSnapshot) {
  const currentBrowser = session.useBrowserStore.getState();
  if (saved.browser.assembly !== currentBrowser.assembly.id) {
    throw new Error(
      `Cannot apply a ${saved.browser.assembly} session into ${currentBrowser.assembly.id}`,
    );
  }

  // 1) Browser store: patch only fields whose serialized values changed.
  const browserUpdates: Partial<ReturnType<typeof session.useBrowserStore.getState>> = {};
  let browserChanged = false;

  const normalizedRegion = createBrowserStore({
    assembly: currentBrowser.assembly,
    region: saved.browser.region,
  }).getState().region;
  if (!jsonEqual(currentBrowser.region, normalizedRegion)) {
    browserUpdates.region = normalizedRegion;
    browserChanged = true;
  }
  if (!jsonEqual(currentBrowser.basePairDetail, saved.browser.basePairDetail)) {
    browserUpdates.basePairDetail = saved.browser.basePairDetail;
    browserChanged = true;
  }
  if (currentBrowser.marginWidth !== saved.browser.marginWidth) {
    browserUpdates.marginWidth = saved.browser.marginWidth;
    browserChanged = true;
  }
  if (currentBrowser.trackWidth !== saved.browser.trackWidth) {
    browserUpdates.trackWidth = saved.browser.trackWidth;
    browserChanged = true;
  }
  if (currentBrowser.fontSize !== saved.browser.fontSize) {
    browserUpdates.fontSize = saved.browser.fontSize;
    browserChanged = true;
  }
  if (currentBrowser.titleSize !== saved.browser.titleSize) {
    browserUpdates.titleSize = saved.browser.titleSize;
    browserChanged = true;
  }
  if (!jsonEqual(currentBrowser.highlights, saved.browser.highlights)) {
    browserUpdates.highlights = saved.browser.highlights;
    browserChanged = true;
  }
  if (currentBrowser.selectionMode !== saved.browser.selectionMode) {
    browserUpdates.selectionMode = saved.browser.selectionMode;
    browserChanged = true;
  }
  if (!jsonEqual(currentBrowser.selectionHighlight, saved.browser.selectionHighlight)) {
    browserUpdates.selectionHighlight = saved.browser.selectionHighlight;
    browserChanged = true;
  }
  if (browserChanged) {
    session.useBrowserStore.setState(browserUpdates);
  }

  // 2) Region groups: patch only when normalized groups differ.
  const nextGroups = normalizeGroups(
    saved.regionGroups,
    saved.browser.highlights.map((highlight) => highlight.id),
  );
  if (!jsonEqual(session.useRegionGroupStore.getState().groups, nextGroups)) {
    session.useRegionGroupStore.setState({ groups: nextGroups });
  }

  // 3) Track store: reuse existing track object references whenever unchanged.
  const currentTracksState = session.useTrackStore.getState();
  const existingById = new Map(
    currentTracksState.tracks.map((track) => [track.base.id, track] as const),
  );
  const resolvedTracks: AnyTrackInstance[] = [];
  let tracksChanged =
    saved.tracks.length !== currentTracksState.tracks.length ||
    !jsonEqual(currentTracksState.pinnedTrackIds, saved.pinnedTrackIds);

  for (let i = 0; i < saved.tracks.length; i++) {
    const incoming = saved.tracks[i];
    const existing = existingById.get(incoming.base.id);
    if (existing && sameTrackForRemoteApply(existing, incoming)) {
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
      jsonEqual(existing.config, incoming.config)
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

  if (tracksChanged) {
    const ordered = orderTracksWithPins(resolvedTracks, saved.pinnedTrackIds);
    session.useTrackStore.setState({
      tracks: ordered.tracks,
      order: ordered.order,
      pinnedTrackIds: [...new Set(saved.pinnedTrackIds)],
    });
  }
}

function sameTrackForRemoteApply(
  existing: AnyTrackInstance,
  incoming: SessionSnapshot["tracks"][number],
): boolean {
  if (
    existing.type !== incoming.type ||
    existing.source !== incoming.source ||
    existing.base.id !== incoming.base.id ||
    existing.base.title !== incoming.base.title ||
    existing.base.display !== incoming.base.display ||
    existing.base.color !== incoming.base.color
  ) {
    return false;
  }
  if (!isDerivedHeightTrack(incoming) && existing.base.height !== incoming.base.height) {
    return false;
  }
  if (!jsonEqual(existing.config, incoming.config)) return false;
  return jsonEqual(existing.metadata ?? null, incoming.metadata ?? null);
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

function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
