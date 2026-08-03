import type { TrackSelectCollection, TrackSelectView } from "../schema/collectionSchema";
import { getOrderedSelectedRows } from "./collectionOrder";
import { getCollectionTrackId, getCollectionTrackIds } from "./collectionRows";
import type { CollectionStoreTrack } from "./collectionTypes";

export type SelectedByCollection = Map<string, Set<string>>;

function createEmptySelection(trackCollections: TrackSelectCollection[]) {
  return new Map(trackCollections.map((collection) => [collection.id, new Set<string>()]));
}

export function createOrderedSelectionFromTracks(
  trackCollections: TrackSelectCollection[],
  tracks: CollectionStoreTrack[],
) {
  const collectionTrackIds = new Set(
    trackCollections.flatMap((collection) =>
      collection.tracks.map((track) => getCollectionTrackId(collection.id, track.id)),
    ),
  );
  return tracks.flatMap((track) => (collectionTrackIds.has(track.base.id) ? [track.base.id] : []));
}

export function createSelectionByCollection(
  trackCollections: TrackSelectCollection[],
  selectedTrackIds: readonly string[],
) {
  const selectedByCollection = createEmptySelection(trackCollections);

  for (const collection of trackCollections) {
    const collectionTrackIds = getCollectionTrackIds(collection);
    const selectedIds = selectedByCollection.get(collection.id)!;
    for (const id of selectedTrackIds) {
      if (collectionTrackIds.has(id)) selectedIds.add(id);
    }
  }

  return selectedByCollection;
}

export function setOrderedCollectionSelection({
  selectedTrackIds,
  collection,
  view,
  selectedIds,
}: {
  selectedTrackIds: readonly string[];
  collection: TrackSelectCollection;
  view: TrackSelectView;
  selectedIds: Set<string>;
}) {
  const collectionTrackIds = getCollectionTrackIds(collection);
  const next = selectedTrackIds.filter((id) => !collectionTrackIds.has(id) || selectedIds.has(id));
  const retainedIds = new Set(next);
  const additions: string[] = [];
  for (const row of getOrderedSelectedRows(collection, view, selectedIds)) {
    if (!retainedIds.has(row.id)) additions.push(row.id);
  }

  return [...next, ...additions];
}

export function clearOrderedSelection(
  selectedTrackIds: readonly string[],
  collection?: TrackSelectCollection,
) {
  if (!collection) return [];
  const collectionTrackIds = getCollectionTrackIds(collection);
  return selectedTrackIds.filter((id) => !collectionTrackIds.has(id));
}

export function removeOrderedTrackIds(
  selectedTrackIds: readonly string[],
  trackIds: readonly string[],
) {
  const idsToRemove = new Set(trackIds);
  return selectedTrackIds.filter((id) => !idsToRemove.has(id));
}
