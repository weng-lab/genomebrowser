import type { TrackSelectCollectionRecord } from "./collectionCompilation";

export function getInitialViewIds(trackCollections: TrackSelectCollectionRecord[]) {
  return new Map(trackCollections.map((collection) => [collection.id, collection.views[0].id]));
}

export function getActiveView(
  collection: TrackSelectCollectionRecord,
  activeViewIdByCollection: Map<string, string>,
) {
  return (
    collection.views.find((view) => view.id === activeViewIdByCollection.get(collection.id)) ??
    collection.views[0]
  );
}
