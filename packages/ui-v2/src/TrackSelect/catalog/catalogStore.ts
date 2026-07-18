import { createTrackFromEntry, type TrackStore } from "@weng-lab/genomebrowser-v2";
import {
  adaptTrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "./catalogInteraction";
import type { TrackSelectCatalog } from "../schema/catalogSchema";
import { getCatalogTrackById } from "./catalogRows";

export function getReconciledTracks({
  trackCatalogs,
  tracks,
  selectedTrackIds,
  registry,
  maxTracks,
  resolveTrackInteraction,
}: {
  trackCatalogs: TrackSelectCatalog[];
  tracks: TrackStore["tracks"];
  selectedTrackIds: readonly string[];
  registry: TrackStore["registry"];
  maxTracks: number;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
}): TrackStore["tracks"] {
  const catalogTracksById = getCatalogTrackById(trackCatalogs);
  assertValidSelectedTrackIds(selectedTrackIds, catalogTracksById, maxTracks);

  const existingTracksById = new Map(tracks.map((track) => [track.base.id, track]));
  const nonCatalogTracks = tracks.filter((track) => !catalogTracksById.has(track.base.id));
  const selectedTracks = selectedTrackIds.map((id) => {
    const existingTrack = existingTracksById.get(id);
    const entry = catalogTracksById.get(id)!;
    if (!resolveTrackInteraction) {
      if (existingTrack) return existingTrack;
      return createTrackFromEntry(registry, { ...entry.track, id });
    }

    const resolvedInteraction = resolveTrackInteraction(entry);
    const track = existingTrack ?? createTrackFromEntry(registry, { ...entry.track, id });
    const { interaction: _interaction, ...trackWithoutInteraction } = track;
    if (resolvedInteraction === undefined) return trackWithoutInteraction;

    return {
      ...trackWithoutInteraction,
      interaction: adaptTrackSelectInteraction(resolvedInteraction, {
        catalogId: entry.catalogId,
        authoredTrackId: entry.track.id,
        metadata: entry.track.metadata,
      }),
    };
  });

  return [...nonCatalogTracks, ...selectedTracks];
}

export function assertValidCatalogTrackIds(
  trackCatalogs: TrackSelectCatalog[],
  selectedTrackIds: readonly string[],
  maxTracks: number,
) {
  assertValidSelectedTrackIds(selectedTrackIds, getCatalogTrackById(trackCatalogs), maxTracks);
}

function assertValidSelectedTrackIds(
  selectedTrackIds: readonly string[],
  catalogTracksById: ReadonlyMap<string, unknown>,
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
    if (!catalogTracksById.has(id)) throw new Error(`Unknown track selection id: ${id}`);
    seen.add(id);
  }
}
