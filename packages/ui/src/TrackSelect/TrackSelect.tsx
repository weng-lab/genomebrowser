import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrackSelectColumnOverrides } from "./collection/collectionColumns";
import type { TrackSelectInteractionResolver } from "./collection/collectionInteraction";
import { assertUniqueCollectionTrackIds } from "./collection/collectionRows";
import { assertValidCollectionTrackIds, getReconciledTracks } from "./collection/collectionStore";
import { TrackSelectContent } from "./layout/trackSelectContent";
import { TrackSelectDialog } from "./layout/trackSelectDialog";
import type { TrackSelectCollection } from "./schema/collectionSchema";
import { validateJson } from "./schema/validateJson";

export type TrackSelectProps = {
  open: boolean;
  onClose: () => void;
  trackCollections: unknown[];
  useTrackStore: TrackStoreInstance;
  title?: string;
  maxTracks?: number;
  initialTrackIds?: readonly string[];
  defaultTrackIds?: readonly string[];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  columnOverrides?: TrackSelectColumnOverrides;
  resolveTrackInteraction?: TrackSelectInteractionResolver;
};

const DEFAULT_TITLE = "Track Select";
const DEFAULT_MAX_TRACKS = 50;

type InitializedDefaults = {
  useTrackStore: TrackStoreInstance;
  key: string;
};

export default function TrackSelect({
  open,
  onClose,
  trackCollections,
  useTrackStore,
  title = DEFAULT_TITLE,
  maxTracks = DEFAULT_MAX_TRACKS,
  initialTrackIds,
  defaultTrackIds,
  onCommittedTrackIds,
  columnOverrides,
  resolveTrackInteraction,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const setTracks = useTrackStore((state) => state.setTracks);
  const parsedTrackCollections = useMemo(() => {
    const parsedCollections = trackCollections.map((collection) =>
      validateJson(collection, registry),
    );
    assertUniqueCollectionTrackIds(parsedCollections);
    return parsedCollections;
  }, [trackCollections, registry]);
  const collectionKey = useMemo(
    () => getCollectionKey(parsedTrackCollections),
    [parsedTrackCollections],
  );
  const initializationTrackIds = initialTrackIds ?? defaultTrackIds;
  const initializationTrackKey = initializationTrackIds
    ? JSON.stringify(initializationTrackIds)
    : undefined;
  const initializationKey = initializationTrackKey
    ? `${collectionKey}:${maxTracks}:${initializationTrackKey}`
    : undefined;
  const initializedDefaultsRef = useRef<InitializedDefaults | undefined>(undefined);
  const [initializedDefaults, setInitializedDefaults] = useState<InitializedDefaults>();

  useLayoutEffect(() => {
    if (defaultTrackIds) {
      assertValidCollectionTrackIds(parsedTrackCollections, defaultTrackIds, maxTracks);
    }
    if (!initializationKey || !initializationTrackIds) {
      initializedDefaultsRef.current = undefined;
      setInitializedDefaults(undefined);
      return;
    }
    if (
      initializedDefaultsRef.current?.useTrackStore === useTrackStore &&
      initializedDefaultsRef.current.key === initializationKey
    ) {
      return;
    }

    const nextTracks = getReconciledTracks({
      trackCollections: parsedTrackCollections,
      tracks: useTrackStore.getState().tracks,
      selectedTrackIds: initializationTrackIds,
      registry,
      maxTracks,
      resolveTrackInteraction,
    });
    const result = setTracks(nextTracks);
    if (!result.ok) throw new Error(result.error);

    const nextInitializedDefaults = { useTrackStore, key: initializationKey };
    initializedDefaultsRef.current = nextInitializedDefaults;
    setInitializedDefaults(nextInitializedDefaults);
  }, [
    defaultTrackIds,
    initializationKey,
    initializationTrackIds,
    maxTracks,
    parsedTrackCollections,
    registry,
    resolveTrackInteraction,
    setTracks,
    useTrackStore,
  ]);

  const defaultsReady =
    !initializationKey ||
    (initializedDefaults?.useTrackStore === useTrackStore &&
      initializedDefaults.key === initializationKey);

  return (
    <TrackSelectDialog open={open} title={title} onClose={onClose}>
      {open && defaultsReady ? (
        <TrackSelectContent
          key={collectionKey}
          trackCollections={parsedTrackCollections}
          tracks={tracks}
          registry={registry}
          setTracks={setTracks}
          defaultTrackIds={defaultTrackIds}
          onCommittedTrackIds={onCommittedTrackIds}
          maxTracks={maxTracks}
          onClose={onClose}
          columnOverrides={columnOverrides}
          resolveTrackInteraction={resolveTrackInteraction}
        />
      ) : null}
    </TrackSelectDialog>
  );
}

function getCollectionKey(trackCollections: TrackSelectCollection[]) {
  return trackCollections
    .map((collection) => {
      const viewIds = collection.views.map((view) => view.id).join(",");
      const trackIds = collection.tracks.map((track) => track.id).join(",");
      return `${collection.id}:${viewIds}:${trackIds}`;
    })
    .join("|");
}
