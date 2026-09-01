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

export type TrackSelectCollectionRecord = Readonly<
  TrackSelectCollection & {
    rows: CollectionGridRow[];
    trackIds: ReadonlySet<string>;
  }
>;

export type CompiledTrackCollections = Readonly<{
  records: TrackSelectCollectionRecord[];
  recordsById: ReadonlyMap<string, TrackSelectCollectionRecord>;
  tracksById: ReadonlyMap<string, CollectionTrackEntry>;
  key: string;
}>;

export function compileTrackCollections(
  trackCollections: TrackSelectCollection[],
): CompiledTrackCollections {
  const records: TrackSelectCollectionRecord[] = [];
  const recordsById = new Map<string, TrackSelectCollectionRecord>();
  const tracksById = new Map<string, CollectionTrackEntry>();
  const keyParts: string[] = [];

  for (const collection of trackCollections) {
    if (recordsById.has(collection.id)) {
      throw new Error(`Duplicate track collection id: ${collection.id}`);
    }

    const rows: CollectionGridRow[] = [];
    const trackIds = new Set<string>();
    const authoredTrackIds: string[] = [];
    for (const track of collection.tracks) {
      const qualifiedTrackId = getCollectionTrackId(collection.id, track.id);
      if (tracksById.has(qualifiedTrackId)) {
        throw new Error(`Duplicate collection track id: ${qualifiedTrackId}`);
      }

      trackIds.add(qualifiedTrackId);
      authoredTrackIds.push(track.id);
      rows.push({
        // Keep metadata first so reserved collection fields below cannot be clobbered.
        ...track.metadata,
        id: qualifiedTrackId,
        title: track.title,
        type: track.type,
        track,
      });
      tracksById.set(qualifiedTrackId, {
        collectionId: collection.id,
        qualifiedTrackId,
        track,
      });
    }

    const record = { ...collection, rows, trackIds };
    records.push(record);
    recordsById.set(record.id, record);
    keyParts.push(
      JSON.stringify([collection.id, collection.views.map((view) => view.id), authoredTrackIds]),
    );
  }

  return {
    records,
    recordsById,
    tracksById,
    key: keyParts.join("|"),
  };
}

export function getCollectionTrackId(collectionId: string, trackId: string) {
  return `${collectionId}::${trackId}`;
}
