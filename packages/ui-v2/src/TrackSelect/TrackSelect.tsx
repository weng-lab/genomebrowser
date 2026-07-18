import type { TrackStoreInstance } from "@weng-lab/genomebrowser-v2";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TrackSelectColumnOverrides } from "./catalog/catalogColumns";
import { assertUniqueCatalogTrackIds } from "./catalog/catalogRows";
import { assertValidCatalogTrackIds, getReconciledTracks } from "./catalog/catalogStore";
import { TrackSelectContent } from "./layout/trackSelectContent";
import { TrackSelectDialog } from "./layout/trackSelectDialog";
import type { TrackSelectCatalog } from "./schema/catalogSchema";
import { validateJson } from "./schema/validateJson";

export type TrackSelectProps = {
  open: boolean;
  onClose: () => void;
  trackCatalogs: unknown[];
  useTrackStore: TrackStoreInstance;
  title?: string;
  maxTracks?: number;
  initialTrackIds?: readonly string[];
  defaultTrackIds?: readonly string[];
  onCommittedTrackIds?: (trackIds: readonly string[]) => void;
  columnOverrides?: TrackSelectColumnOverrides;
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
  trackCatalogs,
  useTrackStore,
  title = DEFAULT_TITLE,
  maxTracks = DEFAULT_MAX_TRACKS,
  initialTrackIds,
  defaultTrackIds,
  onCommittedTrackIds,
  columnOverrides,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const setTracks = useTrackStore((state) => state.setTracks);
  const parsedTrackCatalogs = useMemo(() => {
    const parsedCatalogs = trackCatalogs.map((catalog) => validateJson(catalog, registry));
    assertUniqueCatalogTrackIds(parsedCatalogs);
    return parsedCatalogs;
  }, [trackCatalogs, registry]);
  const catalogKey = useMemo(() => getCatalogKey(parsedTrackCatalogs), [parsedTrackCatalogs]);
  const initializationTrackIds = initialTrackIds ?? defaultTrackIds;
  const initializationTrackKey = initializationTrackIds
    ? JSON.stringify(initializationTrackIds)
    : undefined;
  const initializationKey = initializationTrackKey
    ? `${catalogKey}:${maxTracks}:${initializationTrackKey}`
    : undefined;
  const initializedDefaultsRef = useRef<InitializedDefaults | undefined>(undefined);
  const [initializedDefaults, setInitializedDefaults] = useState<InitializedDefaults>();

  useLayoutEffect(() => {
    if (defaultTrackIds) {
      assertValidCatalogTrackIds(parsedTrackCatalogs, defaultTrackIds, maxTracks);
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
      trackCatalogs: parsedTrackCatalogs,
      tracks: useTrackStore.getState().tracks,
      selectedTrackIds: initializationTrackIds,
      registry,
      maxTracks,
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
    parsedTrackCatalogs,
    registry,
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
          key={catalogKey}
          trackCatalogs={parsedTrackCatalogs}
          tracks={tracks}
          registry={registry}
          setTracks={setTracks}
          defaultTrackIds={defaultTrackIds}
          onCommittedTrackIds={onCommittedTrackIds}
          maxTracks={maxTracks}
          onClose={onClose}
          columnOverrides={columnOverrides}
        />
      ) : null}
    </TrackSelectDialog>
  );
}

function getCatalogKey(trackCatalogs: TrackSelectCatalog[]) {
  return trackCatalogs
    .map((catalog) => {
      const viewIds = catalog.views.map((view) => view.id).join(",");
      const trackIds = catalog.tracks.map((track) => track.id).join(",");
      return `${catalog.id}:${viewIds}:${trackIds}`;
    })
    .join("|");
}
