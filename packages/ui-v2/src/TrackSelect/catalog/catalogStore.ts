import { createTrackFromEntry, type TrackStore } from "@weng-lab/genomebrowser-v2";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { getCatalogTrackById } from "./catalogRows";

export function getReconciledTracks({
  trackCatalogs,
  tracks,
  selectedTrackIds,
  registry,
  maxTracks,
}: {
  trackCatalogs: TrackSelectCatalog[];
  tracks: TrackStore["tracks"];
  selectedTrackIds: readonly string[];
  registry: TrackStore["registry"];
  maxTracks: number;
}) {
  const catalogTracksById = getCatalogTrackById(trackCatalogs);
  assertValidSelectedTrackIds(selectedTrackIds, catalogTracksById, maxTracks);

  const existingTracksById = new Map(tracks.map((track) => [track.base.id, track]));
  const nonCatalogTracks = tracks.filter((track) => !catalogTracksById.has(track.base.id));
  const selectedTracks = selectedTrackIds.map((id) => {
    const existingTrack = existingTracksById.get(id);
    if (existingTrack) return existingTrack;

    const track = catalogTracksById.get(id)!;
    return createTrackFromEntry(registry, { ...track, id });
  });

  return [...nonCatalogTracks, ...selectedTracks];
}

function assertValidSelectedTrackIds(
  selectedTrackIds: readonly string[],
  catalogTracksById: ReadonlyMap<string, unknown>,
  maxTracks: number,
) {
  if (selectedTrackIds.length > maxTracks) {
    throw new Error(
      `Default track count ${selectedTrackIds.length.toLocaleString()} exceeds the maximum of ${maxTracks.toLocaleString()}`,
    );
  }

  const seen = new Set<string>();
  for (const id of selectedTrackIds) {
    if (seen.has(id)) throw new Error(`Duplicate default track id: ${id}`);
    if (!catalogTracksById.has(id)) throw new Error(`Unknown default track id: ${id}`);
    seen.add(id);
  }
}
