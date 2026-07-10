import type { TrackStoreInstance } from "@weng-lab/genomebrowser-v2";
import { useMemo } from "react";
import type { TrackSelectColumnOverrides } from "./catalog/catalogColumns";
import { assertUniqueCatalogTrackIds } from "./catalog/catalogRows";
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
  columnOverrides?: TrackSelectColumnOverrides;
};

const DEFAULT_TITLE = "Track Select";
const DEFAULT_MAX_TRACKS = 50;

export default function TrackSelect({
  open,
  onClose,
  trackCatalogs,
  useTrackStore,
  title = DEFAULT_TITLE,
  maxTracks = DEFAULT_MAX_TRACKS,
  columnOverrides,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const applyTrackChanges = useTrackStore((state) => state.applyTrackChanges);
  const parsedTrackCatalogs = useMemo(() => {
    const parsedCatalogs = trackCatalogs.map((catalog) => validateJson(catalog, registry));
    assertUniqueCatalogTrackIds(parsedCatalogs);
    return parsedCatalogs;
  }, [trackCatalogs, registry]);
  const catalogKey = useMemo(() => getCatalogKey(parsedTrackCatalogs), [parsedTrackCatalogs]);

  return (
    <TrackSelectDialog open={open} title={title} onClose={onClose}>
      {open ? (
        <TrackSelectContent
          key={catalogKey}
          trackCatalogs={parsedTrackCatalogs}
          tracks={tracks}
          registry={registry}
          applyTrackChanges={applyTrackChanges}
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
