import type { TrackMetadata, TrackStoreInstance } from "@weng-lab/genomebrowser";

/** Fields to add or replace, and field names to remove. A track's other fields stay. */
export type TrackMetadataChange = {
  set?: Readonly<TrackMetadata>;
  remove?: readonly string[];
};

export type TrackMetadataOutcome =
  | { ok: true; tracks: { id: string; metadata: TrackMetadata }[] }
  | { ok: false; code: string; error: string };

/**
 * Applies one change to the metadata of each given track, in the given order. Changes every
 * track or none: fails without changes when an ID isn't loaded or a value is invalid.
 */
export function changeTrackMetadata(
  trackStore: TrackStoreInstance,
  trackIds: readonly string[],
  change: TrackMetadataChange,
): TrackMetadataOutcome {
  const { getTrack, updateTrack } = trackStore.getState();
  const missing = trackIds.filter((id) => getTrack(id) === undefined);
  if (missing.length > 0) {
    const ids = missing.map((id) => `"${id}"`).join(", ");
    return { ok: false, code: "TRACK_NOT_FOUND", error: `No loaded track has the ID ${ids}` };
  }
  const tracks = trackIds.map((id) => ({
    id,
    metadata: applyChange(getTrack(id)!.metadata, change),
  }));
  for (const { id, metadata } of tracks) {
    // Every track gets the same change to an already valid record, so either the first update
    // fails and nothing has changed, or every update succeeds.
    const result = updateTrack(id, { metadata });
    if (!result.ok) return result;
  }
  return { ok: true, tracks };
}

function applyChange(
  current: TrackMetadata | undefined,
  { set = {}, remove = [] }: TrackMetadataChange,
): TrackMetadata {
  const removed = new Set(remove);
  return Object.fromEntries(
    Object.entries({ ...current, ...set }).filter(([field]) => !removed.has(field)),
  );
}
