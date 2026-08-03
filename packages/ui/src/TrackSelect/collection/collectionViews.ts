import type { TrackSelectCollection } from "../schema/collectionSchema";

export function getInitialViewIds(trackCollections: TrackSelectCollection[]) {
  return new Map(trackCollections.map((collection) => [collection.id, collection.views[0].id]));
}

export function getActiveView(
  collection: TrackSelectCollection,
  activeViewIdByCollection: Map<string, string>,
) {
  return (
    collection.views.find((view) => view.id === activeViewIdByCollection.get(collection.id)) ??
    collection.views[0]
  );
}
