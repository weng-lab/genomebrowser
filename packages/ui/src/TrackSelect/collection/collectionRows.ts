import type { TrackSelectCollection, TrackSelectTrack } from "../schema/collectionSchema";

export type CollectionGridRow = {
  id: string;
  title: string;
  type: string;
  track: TrackSelectTrack;
  // Metadata defines dynamic grid columns, so rows need a string index signature.
  [field: string]: unknown;
};

export type CollectionTrackEntry = Readonly<{
  collectionId: string;
  qualifiedTrackId: string;
  track: TrackSelectTrack;
}>;

export function getCollectionTrackId(collectionId: string, trackId: string) {
  return `${collectionId}::${trackId}`;
}

export function getCollectionRows(collection: Pick<TrackSelectCollection, "id" | "tracks">) {
  return collection.tracks.map(
    (track): CollectionGridRow => ({
      // Keep metadata first so reserved collection fields below cannot be clobbered.
      ...track.metadata,
      id: getCollectionTrackId(collection.id, track.id),
      title: track.title,
      type: track.type,
      track,
    }),
  );
}

export function getCollectionTrackIds(collection: Pick<TrackSelectCollection, "id" | "tracks">) {
  return new Set(collection.tracks.map((track) => getCollectionTrackId(collection.id, track.id)));
}

export function getCollectionTrackById(trackCollections: TrackSelectCollection[]) {
  const tracksById = new Map<string, CollectionTrackEntry>();

  for (const collection of trackCollections) {
    for (const track of collection.tracks) {
      const qualifiedTrackId = getCollectionTrackId(collection.id, track.id);
      tracksById.set(qualifiedTrackId, {
        collectionId: collection.id,
        qualifiedTrackId,
        track,
      });
    }
  }

  return tracksById;
}

export function assertUniqueCollectionTrackIds(trackCollections: TrackSelectCollection[]) {
  const collectionIds = new Set<string>();
  const seen = new Set<string>();

  for (const collection of trackCollections) {
    if (collectionIds.has(collection.id)) {
      throw new Error(`Duplicate track collection id: ${collection.id}`);
    }
    collectionIds.add(collection.id);

    for (const track of collection.tracks) {
      const id = getCollectionTrackId(collection.id, track.id);
      if (seen.has(id)) throw new Error(`Duplicate collection track id: ${id}`);
      seen.add(id);
    }
  }
}
