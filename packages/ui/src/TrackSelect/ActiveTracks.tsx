import { useMemo } from "react";
import type { AnyTrackInstance, TrackCollection } from "@weng-lab/genomebrowser";
import { compileTrackCollections } from "./collection/collectionCompilation";
import {
  resolveStoreCollectionTrackId,
  createSelectionByCollection,
} from "./collection/collectionSelection";
import type { TrackSelectTrackIdResolver } from "./collection/collectionTypes";
import { getInitialViewIds } from "./collection/collectionViews";
import { SelectedTracksTree } from "./selectedTracksTree/selectedTracksTree";

export type ActiveTracksProps = {
  tracks: AnyTrackInstance[];
  trackCollections: TrackCollection[];
  resolveCollectionTrackId?: TrackSelectTrackIdResolver;
  onRemoveTrackIds: (trackIds: string[]) => void;
};

/** A controlled view of loaded tracks using the collection picker's grouping and tree controls. */
export function ActiveTracks({
  tracks,
  trackCollections,
  resolveCollectionTrackId,
  onRemoveTrackIds,
}: ActiveTracksProps) {
  const catalog = useMemo(
    () =>
      compileTrackCollections(
        trackCollections.map((collection) => ({
          ...collection,
          views: collection.views?.map((view) => ({
            ...view,
            grouping: view.grouping ?? [],
            leaf: view.leaf ?? "title",
          })),
        })),
      ),
    [trackCollections],
  );
  const model = useMemo(() => {
    const displayed = new Map<
      string,
      ReturnType<typeof compileTrackCollections>["records"][number]
    >();
    const runtimeIds = new Map<string, string>();
    let otherId = "other-tracks";
    while (catalog.recordsById.has(otherId)) otherId = "_" + otherId;
    for (const track of tracks) {
      const matchedId = resolveStoreCollectionTrackId(catalog, track, resolveCollectionTrackId);
      const entry = matchedId ? catalog.tracksById.get(matchedId) : undefined;
      const collectionId = entry?.collectionId ?? otherId;
      let collection = displayed.get(collectionId);
      if (!collection) {
        const original = catalog.recordsById.get(collectionId);
        collection = {
          ...(original ?? {
            id: otherId,
            label: "Other tracks",
            assembly: trackCollections[0]?.assembly ?? "unknown",
            views: [
              {
                id: "default",
                label: "Tracks",
                columns: [{ field: "title" }],
                grouping: [],
                leaf: "title",
              },
            ],
            rows: [],
            trackIds: new Set<string>(),
          }),
          tracks: [],
        };
        displayed.set(collectionId, collection);
      }
      collection.tracks.push({
        type: track.type,
        base: track.base,
        config: track.config,
        metadata: entry?.track.metadata,
      });
      runtimeIds.set(`${collectionId}::${track.base.id}`, track.base.id);
    }
    const compiled = compileTrackCollections([...displayed.values()]);
    return {
      collections: compiled.records,
      selectedByCollection: createSelectionByCollection(compiled, [...runtimeIds.keys()]),
      activeViewIdByCollection: getInitialViewIds(compiled.records),
      runtimeIds,
    };
  }, [catalog, tracks, trackCollections, resolveCollectionTrackId]);
  return (
    <SelectedTracksTree
      collections={model.collections}
      selectedByCollection={model.selectedByCollection}
      activeViewIdByCollection={model.activeViewIdByCollection}
      selectedCount={tracks.length}
      height="100%"
      onRemoveTrackIds={(ids) =>
        onRemoveTrackIds(
          ids.flatMap((id) => {
            const runtimeId = model.runtimeIds.get(id);
            return runtimeId === undefined ? [] : [runtimeId];
          }),
        )
      }
    />
  );
}
