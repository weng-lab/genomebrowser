import type { TrackStoreInstance } from "@weng-lab/genomebrowser-v2";
import { useMemo } from "react";
import { assertUniqueCatalogTrackIds } from "./catalog/catalogRows";
import { TrackSelectContent } from "./layout/trackSelectContent";
import { TrackSelectDialog } from "./layout/trackSelectDialog";
import type { TrackSelectFolder } from "./schema/folderSchema";
import { validateJson } from "./schema/validateJson";

export type TrackSelectProps = {
  open: boolean;
  onClose: () => void;
  folders: unknown[];
  useTrackStore: TrackStoreInstance;
  title?: string;
  maxTracks?: number;
};

const DEFAULT_TITLE = "Track Select";
const DEFAULT_MAX_TRACKS = 50;

export default function TrackSelect({
  open,
  onClose,
  folders,
  useTrackStore,
  title = DEFAULT_TITLE,
  maxTracks = DEFAULT_MAX_TRACKS,
}: TrackSelectProps) {
  const registry = useTrackStore((state) => state.registry);
  const tracks = useTrackStore((state) => state.tracks);
  const addTrack = useTrackStore((state) => state.addTrack);
  const removeTrack = useTrackStore((state) => state.removeTrack);
  const catalogFolders = useMemo(() => {
    const parsedFolders = folders.map((folder) =>
      validateJson(folder, registry),
    );
    assertUniqueCatalogTrackIds(parsedFolders);
    return parsedFolders;
  }, [folders, registry]);
  const catalogKey = useMemo(
    () => getCatalogKey(catalogFolders),
    [catalogFolders],
  );

  return (
    <TrackSelectDialog open={open} title={title} onClose={onClose}>
      {open ? (
        <TrackSelectContent
          key={catalogKey}
          folders={catalogFolders}
          tracks={tracks}
          registry={registry}
          addTrack={addTrack}
          removeTrack={removeTrack}
          maxTracks={maxTracks}
          onClose={onClose}
        />
      ) : null}
    </TrackSelectDialog>
  );
}

function getCatalogKey(folders: TrackSelectFolder[]) {
  return folders
    .map((folder) => {
      const viewIds = folder.views.map((view) => view.id).join(",");
      const trackIds = folder.tracks.map((track) => track.config.id).join(",");
      return `${folder.id}:${viewIds}:${trackIds}`;
    })
    .join("|");
}
