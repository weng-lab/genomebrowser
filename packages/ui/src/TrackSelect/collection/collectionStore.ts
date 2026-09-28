import type { AnyTrackInstance, TrackCollection, TrackStore } from "@weng-lab/genomebrowser";
import {
  adaptTrackSelectInteraction,
  type TrackSelectInteractionResolver,
} from "./collectionInteraction";
import {
  getCollectionTrackId,
  type CompiledTrackCollections,
  type CollectionTrackEntry,
} from "./collectionCompilation";

export function getReconciledTracks({
  compiledCollections,
  tracks,
  selectedTrackIds,
  registry,
  maxTracks,
  resolveTrackInteraction,
}: {
  compiledCollections: CompiledTrackCollections;
  tracks: TrackStore["tracks"];
  selectedTrackIds: readonly string[];
  registry: TrackStore["registry"];
  maxTracks: number;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
}): TrackStore["tracks"] {
  const collectionTracksById = compiledCollections.tracksById;
  assertValidSelectedTrackIds(selectedTrackIds, collectionTracksById, maxTracks);

  const existingTracksById = new Map(tracks.map((track) => [track.base.id, track]));
  const nonCollectionTracks = tracks.filter((track) => !collectionTracksById.has(track.base.id));
  const selectedTracks = selectedTrackIds.map((id) => {
    const existingTrack = existingTracksById.get(id);
    const entry = collectionTracksById.get(id)!;
    const track = {
      ...(existingTrack ?? createCollectionTrack(entry.track, entry.collectionId, registry)),
      source: "host" as const,
    };
    return resolveTrackInteraction
      ? bindCollectionInteraction(track, entry, resolveTrackInteraction)
      : track;
  });

  return [...nonCollectionTracks, ...selectedTracks];
}

export function assertValidCollectionTrackIds(
  compiledCollections: CompiledTrackCollections,
  selectedTrackIds: readonly string[],
  maxTracks: number,
) {
  assertValidSelectedTrackIds(selectedTrackIds, compiledCollections.tracksById, maxTracks);
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

function createCollectionTrack(
  track: TrackCollection["tracks"][number],
  collectionId: string,
  registry: TrackStore["registry"],
): AnyTrackInstance {
  const module = registry.get(track.type);
  const input = {
    base: { ...track.base, id: getCollectionTrackId(collectionId, track.base.id) },
    config: track.config,
    source: "host" as const,
  };
  if (module.kind === "composite") {
    if (!("tracks" in track)) throw new Error("Composite collection entry requires child tracks");
    return module.create({
      ...input,
      base: { ...input.base, display: track.base.display as "stack" | "overlay" | undefined },
      tracks: track.tracks.map((child) => createCollectionTrack(child, collectionId, registry)),
    });
  }
  return module.create(input);
}

function bindCollectionInteraction(
  track: AnyTrackInstance,
  entry: CollectionTrackEntry,
  resolve: TrackSelectInteractionResolver,
): AnyTrackInstance {
  if (track.tracks && "tracks" in entry.track) {
    const definitions = new Map(
      entry.track.tracks.map((child) => [
        getCollectionTrackId(entry.collectionId, child.base.id),
        child,
      ]),
    );
    return {
      ...track,
      tracks: track.tracks.map((child) => {
        const definition = definitions.get(child.base.id);
        return definition
          ? bindCollectionInteraction(
              child,
              {
                collectionId: entry.collectionId,
                qualifiedTrackId: child.base.id,
                track: definition,
              },
              resolve,
            )
          : child;
      }),
    };
  }
  const interaction = resolve(entry);
  const { interaction: _interaction, ...withoutInteraction } = track;
  return interaction === undefined
    ? withoutInteraction
    : {
        ...withoutInteraction,
        interaction: adaptTrackSelectInteraction(interaction, {
          collectionId: entry.collectionId,
          authoredTrackId: entry.track.base.id,
          metadata: entry.track.metadata ?? {},
        }),
      };
}
