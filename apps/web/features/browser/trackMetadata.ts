import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import {
  maxTrackMetadataBytes,
  metadataBytes,
  planTrackMetadataChange,
  type TrackMetadataChange,
  type TrackMetadataOutcome,
} from "./trackMetadataCore";

export { maxTrackMetadataBytes, metadataBytes };
export type { TrackMetadataChange, TrackMetadataOutcome };

/**
 * Applies one change to the metadata of each given track, in the given order. Changes every
 * track or none: fails without changes when an ID isn't loaded, a track would have more than
 * `maxTrackMetadataBytes` of metadata, or a value is invalid.
 */
export function changeTrackMetadata(
  trackStore: TrackStoreInstance,
  trackIds: readonly string[],
  change: TrackMetadataChange,
): TrackMetadataOutcome {
  const { tracks, updateTrack } = trackStore.getState();
  const planned = planTrackMetadataChange(tracks, trackIds, change);
  if (!planned.ok) return planned;
  for (const { id, metadata } of planned.tracks) {
    // Every track gets the same change to an already valid record, so either the first update
    // fails and nothing has changed, or every update succeeds.
    const result = updateTrack(id, { metadata });
    if (!result.ok) return result;
  }
  return planned;
}
