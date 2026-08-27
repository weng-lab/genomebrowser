import { createTrackFromEntry, type TrackStore } from "@weng-lab/genomebrowser";
import {
  adaptTrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "./collectionInteraction";
import type { TrackSelectCollection } from "../schema/collectionSchema";
import { getCollectionTrackById } from "./collectionRows";

export function getReconciledTracks({
  trackCollections,
  tracks,
  selectedTrackIds,
  registry,
  maxTracks,
  resolveTrackInteraction,
}: {
  trackCollections: TrackSelectCollection[];
  tracks: TrackStore["tracks"];
  selectedTrackIds: readonly string[];
  registry: TrackStore["registry"];
  maxTracks: number;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
}): TrackStore["tracks"] {
  const collectionTracksById = getCollectionTrackById(trackCollections);
  assertValidSelectedTrackIds(selectedTrackIds, collectionTracksById, maxTracks);

  const existingTracksById = new Map(tracks.map((track) => [track.base.id, track]));
  const nonCollectionTracks = tracks.filter((track) => !collectionTracksById.has(track.base.id));
  const selectedTracks = selectedTrackIds.map((id) => {
    const existingTrack = existingTracksById.get(id);
    const entry = collectionTracksById.get(id)!;
    const track = {
      ...(existingTrack ?? createTrackFromEntry(registry, { ...entry.track, id })),
      source: "host" as const,
    };
    if (!resolveTrackInteraction) return track;

    const resolvedInteraction = resolveTrackInteraction(entry);
    const { interaction: _interaction, ...trackWithoutInteraction } = track;
    if (resolvedInteraction === undefined) return trackWithoutInteraction;

    return {
      ...trackWithoutInteraction,
      interaction: adaptTrackSelectInteraction(resolvedInteraction, {
        collectionId: entry.collectionId,
        authoredTrackId: entry.track.id,
        metadata: entry.track.metadata,
      }),
    };
  });

  return [...nonCollectionTracks, ...selectedTracks];
}

export function assertValidCollectionTrackIds(
  trackCollections: TrackSelectCollection[],
  selectedTrackIds: readonly string[],
  maxTracks: number,
) {
  assertValidSelectedTrackIds(
    selectedTrackIds,
    getCollectionTrackById(trackCollections),
    maxTracks,
  );
}

function assertValidSelectedTrackIds(
  selectedTrackIds: readonly string[],
  collectionTracksById: ReadonlyMap<string, unknown>,
  maxTracks: number,
) {
  if (selectedTrackIds.length > maxTracks) {
    throw new Error(
      `Track selection count ${selectedTrackIds.length.toLocaleString()} exceeds the maximum of ${maxTracks.toLocaleString()}`,
    );
  }

  const seen = new Set<string>();
  for (const id of selectedTrackIds) {
    if (seen.has(id)) throw new Error(`Duplicate track selection id: ${id}`);
    if (!collectionTracksById.has(id)) throw new Error(`Unknown track selection id: ${id}`);
    seen.add(id);
  }
}
