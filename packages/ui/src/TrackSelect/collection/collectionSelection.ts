import type { TrackSelectView } from "../schema/collectionSchema";
import { getOrderedSelectedRows } from "./collectionOrder";
import type {
  CompiledTrackCollections,
  TrackSelectCollectionRecord,
} from "./collectionCompilation";
import type { CollectionStoreTrack } from "./collectionTypes";

export type SelectedByCollection = Map<string, Set<string>>;

function createEmptySelection(collections: TrackSelectCollectionRecord[]) {
  return new Map(collections.map((collection) => [collection.id, new Set<string>()]));
}

export function createOrderedSelectionFromTracks(
  compiledCollections: CompiledTrackCollections,
  tracks: CollectionStoreTrack[],
) {
  return tracks.flatMap((track) =>
    compiledCollections.tracksById.has(track.base.id) ? [track.base.id] : [],
  );
}

export function createSelectionByCollection(
  compiledCollections: CompiledTrackCollections,
  selectedTrackIds: readonly string[],
) {
  const selectedByCollection = createEmptySelection(compiledCollections.records);

  for (const id of selectedTrackIds) {
    const entry = compiledCollections.tracksById.get(id);
    if (entry) selectedByCollection.get(entry.collectionId)!.add(id);
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
  collection: TrackSelectCollectionRecord;
  view: TrackSelectView;
  selectedIds: Set<string>;
}) {
  const next = selectedTrackIds.filter((id) => !collection.trackIds.has(id) || selectedIds.has(id));
  const retainedIds = new Set(next);
  const additions: string[] = [];
  for (const row of getOrderedSelectedRows(collection, view, selectedIds)) {
    if (!retainedIds.has(row.id)) additions.push(row.id);
  }

  return [...next, ...additions];
}

export function clearOrderedSelection(
  selectedTrackIds: readonly string[],
  collection?: TrackSelectCollectionRecord,
) {
  if (!collection) return [];
  return selectedTrackIds.filter((id) => !collection.trackIds.has(id));
}

export function removeOrderedTrackIds(
  selectedTrackIds: readonly string[],
  trackIds: readonly string[],
) {
  const idsToRemove = new Set(trackIds);
  return selectedTrackIds.filter((id) => !idsToRemove.has(id));
}
