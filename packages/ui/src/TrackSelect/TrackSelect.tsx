import type { TrackSelectTrackIdResolver } from "./collection/collectionTypes";
import Box from "@mui/material/Box";
import type { TrackStoreInstance } from "@weng-lab/genomebrowser";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrackSelectColumnOverrides } from "./collection/collectionColumns";
import { compileTrackCollections } from "./collection/collectionCompilation";
import type { TrackSelectInteractionResolver } from "./collection/collectionInteraction";
import { assertValidCollectionTrackIds, getReconciledTracks } from "./collection/collectionStore";
import { TrackSelectContent } from "./layout/trackSelectContent";
import { TrackSelectDialog } from "./layout/trackSelectDialog";
import { validateTrackCollection } from "@weng-lab/genomebrowser";

export type TrackSelectProps = {
  open: boolean;
  /** Embed the picker in the host page or show the default modal dialog. */
  variant?: "dialog" | "inline";
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
  resolveCollectionTrackId?: TrackSelectTrackIdResolver;
};

const DEFAULT_TITLE = "Track Select";
const DEFAULT_MAX_TRACKS = 50;

type InitializedDefaults = {
  useTrackStore: TrackStoreInstance;
  key: string;
};

export default function TrackSelect({
  open,
  variant = "dialog",
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
  resolveCollectionTrackId,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const setTracks = useTrackStore((state) => state.setTracks);
  const compiledCollections = useMemo(() => {
    const parsedCollections = trackCollections.map((collection) =>
      validateTrackCollection(collection, registry.modules),
    );
    return compileTrackCollections(parsedCollections);
  }, [trackCollections, registry]);
  const collectionKey = compiledCollections.key;
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
      assertValidCollectionTrackIds(compiledCollections, defaultTrackIds, maxTracks);
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
      compiledCollections,
      tracks: useTrackStore.getState().tracks,
      selectedTrackIds: initializationTrackIds,
      registry,
      maxTracks,
      resolveTrackInteraction,
      resolveCollectionTrackId,
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
    compiledCollections,
    registry,
    resolveTrackInteraction,
    resolveCollectionTrackId,
    setTracks,
    useTrackStore,
  ]);

  const defaultsReady =
    !initializationKey ||
    (initializedDefaults?.useTrackStore === useTrackStore &&
      initializedDefaults.key === initializationKey);

  const content =
    open && defaultsReady ? (
      <TrackSelectContent
        key={collectionKey}
        compiledCollections={compiledCollections}
        tracks={tracks}
        registry={registry}
        setTracks={setTracks}
        defaultTrackIds={defaultTrackIds}
        onCommittedTrackIds={onCommittedTrackIds}
        maxTracks={maxTracks}
        onClose={onClose}
        columnOverrides={columnOverrides}
        resolveTrackInteraction={resolveTrackInteraction}
        resolveCollectionTrackId={resolveCollectionTrackId}
      />
    ) : null;

  if (variant === "inline") {
    return open ? (
      <Box role="region" aria-label={title}>
        {content}
      </Box>
    ) : null;
  }
  return (
    <TrackSelectDialog open={open} title={title} onClose={onClose}>
      {content}
    </TrackSelectDialog>
  );
}
